import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { Card, CardHeader } from '../../components/ui/Card';
import DataTable from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { UserPlus, Trash2, Edit, Plus } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { Profile, UserRole } from '../../types';

export default function ManageUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'student' as UserRole, phone: '', password: 'Password123!' });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load users'); return; }
    setUsers((data || []) as Profile[]);
    setLoading(false);
  }

  function openCreate() {
    setEditUser(null);
    setForm({ full_name: '', email: '', role: 'student', phone: '', password: 'Password123!' });
    setShowModal(true);
  }

  function openEdit(user: Profile) {
    setEditUser(user);
    setForm({ full_name: user.full_name, email: user.email, role: user.role, phone: user.phone || '', password: '' });
    setShowModal(true);
  }

  async function handleSave() {
    try {
      if (editUser) {
        const { error } = await supabase.from('profiles').update({
          full_name: form.full_name,
          role: form.role,
          phone: form.phone || null,
        }).eq('id', editUser.id);
        if (error) throw error;
        toast.success('User updated');
      } else {
        const { data: newUserId, error } = await supabase.rpc('admin_create_user', {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role
        });
        if (error) throw error;
        
        if (form.phone && newUserId) {
          await supabase.from('profiles').update({ phone: form.phone }).eq('id', newUserId);
        }
        
        toast.success(`User created! Password: ${form.password}`);
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('User deleted');
      loadUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  }

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [enrollClassId, setEnrollClassId] = useState('');

  async function openEnroll(student: Profile) {
    setSelectedStudent(student);
    setLoading(true);
    const [{ data: enrs }, { data: cls }] = await Promise.all([
      supabase.from('enrollments').select('*, class:classes(*)').eq('student_id', student.id),
      supabase.from('classes').select('*'),
    ]);
    setStudentEnrollments(enrs || []);
    setAllClasses(cls || []);
    setLoading(false);
    setShowEnrollModal(true);
  }

  async function handleEnroll() {
    if (!selectedStudent || !enrollClassId) return;
    try {
      const { error } = await supabase.from('enrollments').insert({
        student_id: selectedStudent.id,
        class_id: enrollClassId
      });
      if (error) throw error;
      toast.success('Student enrolled in class');
      setEnrollClassId('');
      // Refresh list
      const { data } = await supabase.from('enrollments').select('*, class:classes(*)').eq('student_id', selectedStudent.id);
      setStudentEnrollments(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll');
    }
  }

  async function handleUnenroll(enrollmentId: string) {
    try {
      const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
      if (error) throw error;
      toast.success('Unenrolled successfully');
      setStudentEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
    } catch {
      toast.error('Failed to unenroll');
    }
  }

  if (loading && !showEnrollModal) return <LoadingSpinner fullPage text="Loading users..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">{users.length} total users</p>
        </div>
        <Button icon={<UserPlus size={18} />} onClick={openCreate}>
          Add User
        </Button>
      </div>

      <Card>
        <DataTable
          columns={[
            { key: 'full_name', label: 'Name', sortable: true },
            { key: 'email', label: 'Email', sortable: true },
            {
              key: 'role', label: 'Role',
              render: (item) => <Badge variant="role" value={String(item.role)}>{String(item.role)}</Badge>,
            },
            { key: 'phone', label: 'Phone', render: (item) => String(item.phone || '—') },
            {
              key: 'created_at', label: 'Joined', sortable: true,
              render: (item) => formatDate(String(item.created_at)),
            },
            {
              key: 'actions', label: 'Actions',
              render: (item) => (
                <div className="flex items-center gap-2">
                  {String(item.role) === 'student' && (
                    <button onClick={() => openEnroll(item as unknown as Profile)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Manage Enrollments">
                      <Plus size={16} />
                    </button>
                  )}
                  <button onClick={() => openEdit(item as unknown as Profile)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(String(item.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={users as unknown as Record<string, unknown>[]}
          searchKeys={['full_name', 'email', 'role']}
          exportable
          exportFilename="users"
        />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="input-field" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" disabled={!!editUser} />
            {editUser && <p className="text-[10px] text-gray-400 mt-1">Email is linked to auth account and cannot be changed here.</p>}
          </div>
          <div>
            <label className="label">Role</label>
            <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value as UserRole})} className="input-field">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {!editUser && (
            <div>
              <label className="label">Temporary Password</label>
              <input value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="input-field" placeholder="Password for the user" />
            </div>
          )}
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="input-field" placeholder="Optional" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1">{editUser ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Enrollment Modal */}
      <Modal isOpen={showEnrollModal} onClose={() => setShowEnrollModal(false)} title={`Enrollments — ${selectedStudent?.full_name || ''}`} size="lg">
        <div className="space-y-4">
          <div className="flex gap-3">
            <select value={enrollClassId} onChange={(e) => setEnrollClassId(e.target.value)} className="input-field flex-1">
              <option value="">Assign to Class (Subject/Lecture)</option>
              {allClasses
                .filter(c => !studentEnrollments.some(e => e.class_id === c.id))
                .map((c) => <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>)
              }
            </select>
            <Button onClick={handleEnroll} icon={<Plus size={16} />}>Assign</Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {studentEnrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-medium">{e.class?.name}</p>
                  <p className="text-xs text-gray-500">{e.class?.subject}</p>
                </div>
                <button onClick={() => handleUnenroll(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {studentEnrollments.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Not enrolled in any classes</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
