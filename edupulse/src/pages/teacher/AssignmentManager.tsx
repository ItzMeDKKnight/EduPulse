import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAssignments } from '../../hooks/useAssignments';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, FileText, Download, Save } from 'lucide-react';
import { formatDate, getTimeRemaining } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { Class, Assignment, AssignmentSubmission, Profile } from '../../types';

export default function AssignmentManager() {
  const { profile } = useAuth();
  const { createAssignment, fetchSubmissionsByAssignment, gradeSubmission, submissions, loading: hookLoading } = useAssignments();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [form, setForm] = useState({ class_id: '', title: '', description: '', due_date: '', max_marks: 100 });
  const [gradeData, setGradeData] = useState<Record<string, { marks: string; feedback: string }>>({});

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  async function loadData() {
    const [{ data: cls }, { data: assigns }] = await Promise.all([
      supabase.from('classes').select('*').eq('teacher_id', profile!.id),
      supabase.from('assignments').select('*, class:classes!class_id(id, name, subject)').eq('created_by', profile!.id).order('due_date', { ascending: false }),
    ]);
    setClasses((cls || []) as Class[]);
    setAssignments((assigns || []) as unknown as Assignment[]);
    setLoading(false);
  }

  async function handleCreate() {
    try {
      await createAssignment(form.class_id, form.title, form.description, form.due_date, form.max_marks, profile!.id);
      toast.success('Assignment created!');
      setShowCreate(false);
      setForm({ class_id: '', title: '', description: '', due_date: '', max_marks: 100 });
      loadData();
    } catch { toast.error('Failed to create'); }
  }

  async function openGrade(assignment: Assignment) {
    setSelectedAssignment(assignment);
    await fetchSubmissionsByAssignment(assignment.id);
    setShowGrade(true);
  }

  async function handleGrade(subId: string) {
    const g = gradeData[subId];
    if (!g || !g.marks) return;
    try {
      await gradeSubmission(subId, parseInt(g.marks), g.feedback, profile!.id);
      toast.success('Graded!');
      if (selectedAssignment) fetchSubmissionsByAssignment(selectedAssignment.id);
    } catch { toast.error('Failed to grade'); }
  }

  if (loading) return <LoadingSpinner fullPage text="Loading assignments..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Assignment Manager</h1>
          <p className="page-subtitle">Create and grade assignments</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setShowCreate(true)}>New Assignment</Button>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.map((a) => (
          <Card key={a.id} hover>
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <span className="text-xs font-medium text-warning-500">{getTimeRemaining(a.due_date)}</span>
              </div>
              <h3 className="font-medium text-gray-900">{a.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{(a.class as unknown as Class)?.name} • Max: {a.max_marks} marks</p>
              <p className="text-xs text-gray-400 mt-1">Due: {formatDate(a.due_date)}</p>
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => openGrade(a)}>
                View Submissions
              </Button>
            </CardBody>
          </Card>
        ))}
        {assignments.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No assignments created yet</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Assignment">
        <div className="space-y-4">
          <div>
            <label className="label">Class</label>
            <select value={form.class_id} onChange={(e) => setForm({...form, class_id: e.target.value})} className="input-field">
              <option value="">Select Class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="input-field" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due Date</label>
              <input type="datetime-local" value={form.due_date} onChange={(e) => setForm({...form, due_date: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="label">Max Marks</label>
              <input type="number" value={form.max_marks} onChange={(e) => setForm({...form, max_marks: parseInt(e.target.value)})} className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} className="flex-1">Create</Button>
          </div>
        </div>
      </Modal>

      {/* Grade Modal */}
      <Modal isOpen={showGrade} onClose={() => setShowGrade(false)} title={`Submissions — ${selectedAssignment?.title || ''}`} size="xl">
        <div className="space-y-3">
          {hookLoading ? <LoadingSpinner /> : submissions.map((sub) => {
            const student = sub.student as unknown as Profile;
            const gd = gradeData[sub.id] || { marks: String(sub.marks_obtained || ''), feedback: sub.feedback || '' };
            return (
              <div key={sub.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{student?.full_name}</p>
                    <p className="text-xs text-gray-500">{student?.email}</p>
                  </div>
                  <Badge variant="status" value={sub.status}>{sub.status}</Badge>
                </div>
                {sub.file_url && (
                  <a href={sub.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-500 hover:underline">
                    <Download size={12} /> {sub.file_name || 'Download'}
                  </a>
                )}
                {sub.status !== 'graded' && sub.status !== 'pending' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number" placeholder="Marks" min={0} max={selectedAssignment?.max_marks || 100}
                      value={gd.marks}
                      onChange={(e) => setGradeData({...gradeData, [sub.id]: {...gd, marks: e.target.value}})}
                      className="input-field w-24 text-sm py-1.5"
                    />
                    <input
                      type="text" placeholder="Feedback"
                      value={gd.feedback}
                      onChange={(e) => setGradeData({...gradeData, [sub.id]: {...gd, feedback: e.target.value}})}
                      className="input-field flex-1 text-sm py-1.5"
                    />
                    <Button size="sm" icon={<Save size={14} />} onClick={() => handleGrade(sub.id)}>Grade</Button>
                  </div>
                )}
                {sub.status === 'graded' && (
                  <p className="text-xs text-secondary-600">Score: {sub.marks_obtained}/{selectedAssignment?.max_marks} — {sub.feedback}</p>
                )}
              </div>
            );
          })}
          {submissions.length === 0 && !hookLoading && (
            <p className="text-center text-gray-400 py-6">No submissions yet</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
