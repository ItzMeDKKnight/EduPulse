import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { StatCard } from '../../components/ui/Card';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import DataTable from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Users, BookOpen, GraduationCap, UserCheck, ClipboardList, CalendarCheck } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { Profile } from '../../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, parents: 0, classes: 0 });
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuizzes, setActiveQuizzes] = useState(0);
  const [pendingAssignments, setPendingAssignments] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [
        { count: students },
        { count: teachers },
        { count: parents },
        { count: classes },
        { data: recent },
        { count: quizzes },
        { count: assignments },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parent'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('assignment_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        students: students || 0,
        teachers: teachers || 0,
        parents: parents || 0,
        classes: classes || 0,
      });
      setRecentUsers((recent || []) as Profile[]);
      setActiveQuizzes(quizzes || 0);
      setPendingAssignments(assignments || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage text="Loading dashboard..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Overview of your educational platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={stats.students}
          icon={<GraduationCap className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-secondary-400 to-secondary-600"
        />
        <StatCard
          label="Total Teachers"
          value={stats.teachers}
          icon={<UserCheck className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-primary-400 to-primary-600"
        />
        <StatCard
          label="Total Parents"
          value={stats.parents}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-warning-400 to-warning-600"
        />
        <StatCard
          label="Total Classes"
          value={stats.classes}
          icon={<BookOpen className="w-6 h-6 text-white" />}
          color="bg-gradient-to-br from-purple-400 to-purple-600"
        />
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card hover>
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Quizzes</p>
              <p className="text-2xl font-heading font-bold">{activeQuizzes}</p>
            </div>
          </CardBody>
        </Card>
        <Card hover>
          <CardBody className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Submissions</p>
              <p className="text-2xl font-heading font-bold">{pendingAssignments}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Users Table */}
      <Card>
        <CardHeader>
          <h2 className="section-title">Recent Registrations</h2>
        </CardHeader>
        <DataTable
          columns={[
            { key: 'full_name', label: 'Name', sortable: true },
            { key: 'email', label: 'Email', sortable: true },
            {
              key: 'role',
              label: 'Role',
              render: (item) => (
                <Badge variant="role" value={String(item.role)}>
                  {String(item.role)}
                </Badge>
              ),
            },
            {
              key: 'created_at',
              label: 'Joined',
              sortable: true,
              render: (item) => formatDate(String(item.created_at)),
            },
          ]}
          data={recentUsers as unknown as Record<string, unknown>[]}
          searchKeys={['full_name', 'email']}
          paginate={false}
        />
      </Card>
    </div>
  );
}
