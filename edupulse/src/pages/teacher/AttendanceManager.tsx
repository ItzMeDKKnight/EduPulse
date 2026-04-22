import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAttendance } from '../../hooks/useAttendance';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Save, CheckCircle2, XCircle, Clock, FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import type { Class, Profile, AttendanceStatus, AttendanceFormRow } from '../../types';

export default function AttendanceManager() {
  const { profile } = useAuth();
  const { markAttendance, fetchAttendanceByClass, loading: attLoading } = useAttendance();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<AttendanceFormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) loadClasses();
  }, [profile]);

  async function loadClasses() {
    const { data } = await supabase.from('classes').select('*').eq('teacher_id', profile!.id);
    setClasses((data || []) as Class[]);
    setLoading(false);
  }

  async function loadStudents() {
    if (!selectedClass) return;
    setLoading(true);

    // Get enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student:profiles!student_id(id, full_name)')
      .eq('class_id', selectedClass);

    // Get existing attendance
    const existingAttendance = await fetchAttendanceByClass(selectedClass, selectedDate);

    const rows: AttendanceFormRow[] = (enrollments || []).map((e) => {
      const student = e.student as unknown as Profile;
      const existing = (existingAttendance || []).find((a: { student_id: string }) => a.student_id === student.id);
      return {
        student_id: student.id,
        student_name: student.full_name,
        status: (existing?.status as AttendanceStatus) || 'present',
        note: existing?.note || '',
      };
    });

    setStudents(rows);
    setLoading(false);
  }

  useEffect(() => {
    if (selectedClass) loadStudents();
  }, [selectedClass, selectedDate]);

  function setStatus(idx: number, status: AttendanceStatus) {
    setStudents((prev) => prev.map((s, i) => i === idx ? { ...s, status } : s));
  }

  function setNote(idx: number, note: string) {
    setStudents((prev) => prev.map((s, i) => i === idx ? { ...s, note } : s));
  }

  function bulkMark(status: AttendanceStatus) {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  }

  async function handleSave() {
    if (!selectedClass || !profile) return;
    setSaving(true);
    try {
      await markAttendance(selectedClass, selectedDate, students, profile.id);
      toast.success('Attendance saved successfully!');
    } catch {
      toast.error('Failed to save attendance');
    }
    setSaving(false);
  }

  const statusBtns: { status: AttendanceStatus; icon: React.ReactNode; label: string; color: string }[] = [
    { status: 'present', icon: <CheckCircle2 size={16} />, label: '✅', color: 'bg-green-100 text-green-700 border-green-300' },
    { status: 'absent', icon: <XCircle size={16} />, label: '❌', color: 'bg-red-100 text-red-700 border-red-300' },
    { status: 'late', icon: <Clock size={16} />, label: '⏰', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { status: 'excused', icon: <FileCheck size={16} />, label: '📋', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  ];

  if (loading && classes.length === 0) return <LoadingSpinner fullPage text="Loading..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Attendance Manager</h1>
        <p className="page-subtitle">Mark and manage class attendance</p>
      </div>

      {/* Controls */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="label">Class</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input-field">
                <option value="">Select Class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="input-field" />
            </div>
          </div>
        </CardBody>
      </Card>

      {selectedClass && students.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="section-title">{students.length} Students</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => bulkMark('present')}>All Present</Button>
                <Button variant="ghost" size="sm" onClick={() => bulkMark('absent')}>All Absent</Button>
              </div>
            </div>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {students.map((s, i) => (
              <div key={s.student_id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.student_name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {statusBtns.map((btn) => (
                    <button
                      key={btn.status}
                      onClick={() => setStatus(i, btn.status)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        s.status === btn.status ? btn.color : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                      )}
                      title={btn.status}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={s.note}
                  onChange={(e) => setNote(i, e.target.value)}
                  placeholder="Note..."
                  className="input-field w-32 text-xs py-1.5"
                />
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <Button onClick={handleSave} loading={saving || attLoading} icon={<Save size={16} />}>
              Save Attendance
            </Button>
          </div>
        </Card>
      )}

      {selectedClass && students.length === 0 && !loading && (
        <Card>
          <CardBody>
            <p className="text-center text-gray-400 py-8">No students enrolled in this class</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
