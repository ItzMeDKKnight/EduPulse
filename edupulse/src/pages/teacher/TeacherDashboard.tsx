import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/Card';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import { BookOpen, CalendarCheck, FileText, ClipboardList, Award } from 'lucide-react';
import { formatDate, getTimeRemaining } from '../../lib/utils';
import type { Class, Assignment, Quiz } from '../../types';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState(0);

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    try {
      const [{ data: cls }, { data: assigns }, { data: qz }, { count: todayCount }] = await Promise.all([
        supabase.from('classes').select('*').eq('teacher_id', profile!.id),
        supabase.from('assignments').select('*, class:classes!class_id(id, name, subject)').eq('created_by', profile!.id).order('due_date', { ascending: true }).limit(5),
        supabase.from('quizzes').select('*, class:classes!class_id(id, name, subject)').eq('created_by', profile!.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('marked_by', profile!.id).eq('date', new Date().toISOString().split('T')[0]),
      ]);
      setClasses((cls || []) as Class[]);
      setAssignments((assigns || []) as unknown as Assignment[]);
      setQuizzes((qz || []) as unknown as Quiz[]);
      setTodayAttendance(todayCount || 0);
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
        <h1 className="page-title">Teacher Dashboard</h1>
        <p className="page-subtitle">Welcome back, {profile?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Classes" value={classes.length} icon={<BookOpen className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-primary-400 to-primary-600" />
        <StatCard label="Today's Attendance" value={todayAttendance} icon={<CalendarCheck className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-secondary-400 to-secondary-600" />
        <StatCard label="Active Assignments" value={assignments.length} icon={<FileText className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-warning-400 to-warning-600" />
        <StatCard label="Quizzes" value={quizzes.length} icon={<ClipboardList className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-purple-400 to-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Classes */}
        <Card>
          <CardHeader><h2 className="section-title">My Classes</h2></CardHeader>
          <CardBody className="space-y-3">
            {classes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No classes assigned</p>
            ) : (
              classes.map((cls: Class) => (
                <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{cls.name}</p>
                    <p className="text-xs text-gray-500">{cls.subject} • {cls.academic_year}</p>
                  </div>
                  <Badge className="bg-primary-100 text-primary-700">{cls.subject}</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader><h2 className="section-title">Assignments Due</h2></CardHeader>
          <CardBody className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No assignments</p>
            ) : (
              assignments.map((a: Assignment) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-gray-500">{(a.class as unknown as Class)?.name} • Due {formatDate(a.due_date)}</p>
                  </div>
                  <span className="text-xs font-medium text-warning-500">{getTimeRemaining(a.due_date)}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Active Quizzes */}
      <Card>
        <CardHeader><h2 className="section-title">Recent Quizzes</h2></CardHeader>
        <CardBody className="space-y-3">
          {quizzes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No quizzes created</p>
          ) : (
            quizzes.map((q: Quiz) => (
              <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-medium">{q.title}</p>
                  <p className="text-xs text-gray-500">{(q.class as unknown as Class)?.name} • {q.duration_minutes} min</p>
                </div>
                <Badge variant="status" value={q.status}>{q.status}</Badge>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
