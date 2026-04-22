import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { Card, CardHeader } from '../../components/ui/Card';
import DataTable from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { UserPlus, Trash2, Edit } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { Profile, UserRole } from '../../types';

export default function ManageUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', role: 'student' as UserRole, phone: '' });

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
    setForm({ full_name: '', email: '', role: 'student', phone: '' });
    setShowModal(true);
  }

  function openEdit(user: Profile) {
    setEditUser(user);
    setForm({ full_name: user.full_name, email: user.email, role: user.role, phone: user.phone || '' });
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
      }
      setShowModal(false);
      loadUsers();
    } catch {
      toast.error('Failed to save');
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

  if (loading) return <LoadingSpinner fullPage text="Loading users..." />;

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
          {!editUser && (
            <div>
              <label className="label">Email</label>
              <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" />
            </div>
          )}
          <div>
            <label className="label">Role</label>
            <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value as UserRole})} className="input-field">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
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
    </div>
  );
}
