import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { Card, CardHeader } from '../../components/ui/Card';
import DataTable from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, Trash2, Edit, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Class, Profile, Enrollment } from '../../types';

export default function ManageClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [editClass, setEditClass] = useState<Class | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', teacher_id: '', academic_year: new Date().getFullYear().toString() });
  const [enrollStudentId, setEnrollStudentId] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: cls }, { data: tchr }, { data: stds }] = await Promise.all([
      supabase.from('classes').select('*, teacher:profiles!teacher_id(id, full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'teacher'),
      supabase.from('profiles').select('*').eq('role', 'student'),
    ]);
    setClasses((cls || []) as unknown as Class[]);
    setTeachers((tchr || []) as Profile[]);
    setStudents((stds || []) as Profile[]);
    setLoading(false);
  }

  async function loadEnrollments(classId: string) {
    const { data } = await supabase
      .from('enrollments')
      .select('*, student:profiles!student_id(id, full_name, email)')
      .eq('class_id', classId);
    setEnrollments((data || []) as unknown as Enrollment[]);
  }

  function openCreate() {
    setEditClass(null);
    setForm({ name: '', subject: '', teacher_id: '', academic_year: new Date().getFullYear().toString() });
    setShowModal(true);
  }

  function openEdit(cls: Class) {
    setEditClass(cls);
    setForm({ name: cls.name, subject: cls.subject, teacher_id: cls.teacher_id, academic_year: cls.academic_year });
    setShowModal(true);
  }

  function openEnroll(cls: Class) {
    setSelectedClass(cls);
    loadEnrollments(cls.id);
    setShowEnrollModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.subject || !form.teacher_id) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editClass) {
        const { error } = await supabase.from('classes').update(form).eq('id', editClass.id);
        if (error) throw error;
        toast.success('Class updated');
      } else {
        const { error } = await supabase.from('classes').insert(form);
        if (error) throw error;
        toast.success('Class created');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) { 
      toast.error(err.message || 'Failed to save'); 
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this class?')) return;
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) { toast.error('Failed'); return; }
    toast.success('Deleted');
    loadData();
  }

  async function handleEnroll() {
    if (!selectedClass || !enrollStudentId) return;
    const { error } = await supabase.from('enrollments').insert({
      student_id: enrollStudentId,
      class_id: selectedClass.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Student enrolled');
    setEnrollStudentId('');
    loadEnrollments(selectedClass.id);
  }

  async function handleUnenroll(enrollmentId: string) {
    const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
    if (error) { toast.error('Failed'); return; }
    toast.success('Student removed');
    if (selectedClass) loadEnrollments(selectedClass.id);
  }

  if (loading) return <LoadingSpinner fullPage text="Loading classes..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Manage Classes</h1>
          <p className="page-subtitle">{classes.length} classes</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={openCreate}>New Class</Button>
      </div>

      <Card>
        <DataTable
          columns={[
            { key: 'name', label: 'Class Name', sortable: true },
            { key: 'subject', label: 'Subject', sortable: true },
            {
              key: 'teacher', label: 'Teacher',
              render: (item) => {
                const t = item.teacher as unknown as Profile | null;
                return t?.full_name || '—';
              },
            },
            { key: 'academic_year', label: 'Year', sortable: true },
            {
              key: 'actions', label: 'Actions',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => openEnroll(item as unknown as Class)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Manage Students">
                    <UserPlus size={16} />
                  </button>
                  <button onClick={() => openEdit(item as unknown as Class)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(String(item.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={classes as unknown as Record<string, unknown>[]}
          searchKeys={['name', 'subject']}
          exportable
          exportFilename="classes"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editClass ? 'Edit Class' : 'New Class'}>
        <div className="space-y-4">
          <div>
            <label className="label">Class Name</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input-field" placeholder="e.g. Math 101" />
          </div>
          <div>
            <label className="label">Subject</label>
            <input value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="input-field" placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label className="label">Teacher</label>
            <select value={form.teacher_id} onChange={(e) => setForm({...form, teacher_id: e.target.value})} className="input-field">
              <option value="">Select Teacher</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Academic Year</label>
            <input value={form.academic_year} onChange={(e) => setForm({...form, academic_year: e.target.value})} className="input-field" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1">{editClass ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Enrollment Modal */}
      <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title={`Enrollments — ${selectedClass?.name || ''}`} size="lg">
        <div className="space-y-4">
          <div className="flex gap-3">
            <select value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)} className="input-field flex-1">
              <option value="">Select Student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
            </select>
            <Button onClick={handleEnroll} icon={<UserPlus size={16} />}>Enroll</Button>
          </div>
          <div className="space-y-2">
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-medium">{(e.student as unknown as Profile)?.full_name}</p>
                  <p className="text-xs text-gray-500">{(e.student as unknown as Profile)?.email}</p>
                </div>
                <button onClick={() => handleUnenroll(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {enrollments.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No students enrolled yet</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
