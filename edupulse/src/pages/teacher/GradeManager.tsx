import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useMarks } from '../../hooks/useMarks';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DataTable from '../../components/ui/Table';
import { Plus, Upload, Brain, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import type { Class, Profile, ExamType } from '../../types';

export default function GradeManager() {
  const { profile } = useAuth();
  const { uploadMark, bulkUploadMarks, generateReport, loading: hookLoading } = useMarks();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [marks, setMarks] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState('');
  const [reportStudent, setReportStudent] = useState('');
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [form, setForm] = useState({ student_id: '', class_id: '', exam_type: 'midterm' as ExamType, subject: '', marks_obtained: 0, max_marks: 100, exam_date: '', remarks: '' });

  useEffect(() => { if (profile) loadData(); }, [profile]);

  async function loadData() {
    const [{ data: cls }] = await Promise.all([
      supabase.from('classes').select('*').eq('teacher_id', profile!.id),
    ]);
    setClasses((cls || []) as Class[]);
    setLoading(false);
  }

  async function loadStudentsForClass(classId: string) {
    setSelectedClass(classId);
    const { data: enrollments } = await supabase.from('enrollments').select('student:profiles!student_id(*)').eq('class_id', classId);
    setStudents((enrollments || []).map(e => e.student as unknown as Profile));

    const { data: marksData } = await supabase.from('marks').select('*, student:profiles!student_id(id, full_name)').eq('class_id', classId).order('exam_date', { ascending: false });
    setMarks((marksData || []) as unknown as Record<string, unknown>[]);
  }

  async function handleUpload() {
    try {
      await uploadMark({ ...form, uploaded_by: profile!.id });
      toast.success('Mark uploaded!');
      setShowUpload(false);
      if (selectedClass) loadStudentsForClass(selectedClass);
    } catch { toast.error('Failed'); }
  }

  function handleCSVParse(file: File) {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCsvData(results.data as Record<string, string>[]);
        toast.success(`${results.data.length} rows parsed`);
      },
      error: () => toast.error('CSV parse error'),
    });
  }

  async function handleBulkUpload() {
    if (!selectedClass) return;
    try {
      const records = csvData.map(row => ({
        student_id: row.student_id,
        class_id: selectedClass,
        exam_type: row.exam_type || 'midterm',
        subject: row.subject,
        marks_obtained: parseFloat(row.marks_obtained),
        max_marks: parseFloat(row.max_marks || '100'),
        exam_date: row.exam_date || new Date().toISOString().split('T')[0],
        uploaded_by: profile!.id,
        remarks: row.remarks || '',
      }));
      await bulkUploadMarks(records);
      toast.success('Bulk upload complete!');
      setShowBulk(false);
      setCsvData([]);
      loadStudentsForClass(selectedClass);
    } catch { toast.error('Bulk upload failed'); }
  }

  async function handleGenerateReport(studentId: string, studentName: string) {
    setReportStudent(studentName);
    try {
      const text = await generateReport(studentId, studentName);
      setReport(text);
      setShowReport(true);
    } catch { toast.error('Failed to generate report'); }
  }

  function downloadTemplate() {
    const csv = 'student_id,subject,exam_type,marks_obtained,max_marks,exam_date,remarks\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'marks_template.csv';
    link.click();
  }

  if (loading) return <LoadingSpinner fullPage text="Loading..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Grade Manager</h1>
          <p className="page-subtitle">Upload and manage student marks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Upload size={16} />} onClick={() => setShowBulk(true)}>Bulk CSV</Button>
          <Button icon={<Plus size={18} />} onClick={() => setShowUpload(true)}>Add Mark</Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <label className="label">Select Class</label>
          <select value={selectedClass} onChange={(e) => loadStudentsForClass(e.target.value)} className="input-field max-w-md">
            <option value="">Choose Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>)}
          </select>
        </CardBody>
      </Card>

      {selectedClass && (
        <>
          {/* Students with AI report */}
          <Card>
            <CardHeader><h2 className="section-title">Students</h2></CardHeader>
            <CardBody className="space-y-2">
              {students.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-sm font-medium">{s.full_name}</p>
                  <Button size="sm" variant="outline" icon={<Brain size={14} />} loading={hookLoading} onClick={() => handleGenerateReport(s.id, s.full_name)}>
                    AI Report
                  </Button>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Marks Table */}
          <Card>
            <CardHeader><h2 className="section-title">Marks Records</h2></CardHeader>
            <DataTable
              columns={[
                { key: 'student', label: 'Student', render: (item) => ((item.student as unknown as Profile)?.full_name || '—') },
                { key: 'subject', label: 'Subject', sortable: true },
                { key: 'exam_type', label: 'Exam', sortable: true },
                { key: 'marks_obtained', label: 'Marks', render: (item) => `${item.marks_obtained}/${item.max_marks}` },
                { key: 'exam_date', label: 'Date', sortable: true },
                { key: 'remarks', label: 'Remarks', render: (item) => String(item.remarks || '—') },
              ]}
              data={marks}
              searchKeys={['subject', 'exam_type']}
              exportable exportFilename="marks"
            />
          </Card>
        </>
      )}

      {/* Upload Single Mark Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Mark">
        <div className="space-y-4">
          <div><label className="label">Student</label><select value={form.student_id} onChange={(e) => setForm({...form, student_id: e.target.value})} className="input-field"><option value="">Select</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
          <div><label className="label">Class</label><select value={form.class_id || selectedClass} onChange={(e) => setForm({...form, class_id: e.target.value})} className="input-field"><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Subject</label><input value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="input-field" /></div>
            <div><label className="label">Exam Type</label><select value={form.exam_type} onChange={(e) => setForm({...form, exam_type: e.target.value as ExamType})} className="input-field"><option value="midterm">Midterm</option><option value="final">Final</option><option value="quiz">Quiz</option><option value="assignment">Assignment</option></select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Marks</label><input type="number" value={form.marks_obtained} onChange={(e) => setForm({...form, marks_obtained: parseFloat(e.target.value)})} className="input-field" /></div>
            <div><label className="label">Max</label><input type="number" value={form.max_marks} onChange={(e) => setForm({...form, max_marks: parseFloat(e.target.value)})} className="input-field" /></div>
            <div><label className="label">Date</label><input type="date" value={form.exam_date} onChange={(e) => setForm({...form, exam_date: e.target.value})} className="input-field" /></div>
          </div>
          <div><label className="label">Remarks</label><input value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} className="input-field" /></div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowUpload(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleUpload} className="flex-1">Upload</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk CSV Modal */}
      <Modal isOpen={showBulk} onClose={() => setShowBulk(false)} title="Bulk CSV Upload" size="lg">
        <div className="space-y-4">
          <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={downloadTemplate}>Download Template</Button>
          <div>
            <label className="label">Upload CSV</label>
            <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleCSVParse(e.target.files[0])} className="input-field" />
          </div>
          {csvData.length > 0 && (
            <>
              <p className="text-sm text-gray-500">{csvData.length} rows ready to upload</p>
              <div className="max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg text-xs font-mono">
                {csvData.slice(0, 5).map((row, i) => <div key={i}>{JSON.stringify(row)}</div>)}
                {csvData.length > 5 && <div>... and {csvData.length - 5} more</div>}
              </div>
              <Button onClick={handleBulkUpload} className="w-full" loading={hookLoading}>Upload All</Button>
            </>
          )}
        </div>
      </Modal>

      {/* AI Report Modal */}
      <Modal isOpen={showReport} onClose={() => setShowReport(false)} title={`AI Report — ${reportStudent}`} size="lg">
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br/>').replace(/## /g, '<h3>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </Modal>
    </div>
  );
}
