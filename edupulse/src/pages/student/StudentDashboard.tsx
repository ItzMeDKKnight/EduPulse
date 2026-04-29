import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAttendance } from '../../hooks/useAttendance';
import { useMarks } from '../../hooks/useMarks';
import { StatCard, Card, CardHeader, CardBody } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CalendarCheck, FileText, ClipboardList, BarChart3, Brain } from 'lucide-react';
import { formatDate, getTimeRemaining } from '../../lib/utils';
import type { AssignmentSubmission, Quiz, Assignment, Attendance } from '../../types';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const { getAttendanceSummary } = useAttendance();
  const { fetchLatestReport } = useMarks();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<AssignmentSubmission[]>([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<Quiz[]>([]);
  const [aiReport, setAiReport] = useState<string | null>(null);

  useEffect(() => {
    if (profile) loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    const timeout = setTimeout(() => {
      console.warn('Dashboard loading timed out');
      setLoading(false);
    }, 7000);

    try {
      const [{ data: att }, { data: subs }, { data: enrollments }] = await Promise.all([
        supabase.from('attendance').select('*').eq('student_id', profile!.id),
        supabase.from('assignment_submissions').select('*, assignment:assignments!assignment_id(*)').eq('student_id', profile!.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('enrollments').select('class_id').eq('student_id', profile!.id),
      ]);

      clearTimeout(timeout);
      setAttendanceData((att || []) as unknown as Attendance[]);
      setPendingAssignments((subs || []) as unknown as AssignmentSubmission[]);

      if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map(e => e.class_id);
        const { data: quizzes } = await supabase.from('quizzes').select('*, class:classes!class_id(id, name, subject)').in('class_id', classIds).eq('status', 'active').order('start_time', { ascending: true }).limit(5);
        setUpcomingQuizzes((quizzes || []) as unknown as Quiz[]);
      }

      const report = await fetchLatestReport(profile!.id);
      if (report) setAiReport(report.report_text);
    } catch (err) {
      clearTimeout(timeout);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage text="Loading dashboard..." />;

  const summary = getAttendanceSummary(attendanceData);
  const pieData = [
    { name: 'Present', value: summary.present, color: '#0e9f6e' },
    { name: 'Absent', value: summary.absent, color: '#e02424' },
    { name: 'Late', value: summary.late, color: '#ff5a1f' },
    { name: 'Excused', value: summary.excused, color: '#1a56db' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Student Dashboard</h1>
        <p className="page-subtitle">Welcome back, {profile?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance %" value={`${summary.percentage}%`} icon={<CalendarCheck className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-secondary-400 to-secondary-600" />
        <StatCard label="Days Present" value={summary.present} icon={<CalendarCheck className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-primary-400 to-primary-600" />
        <StatCard label="Pending Tasks" value={pendingAssignments.length} icon={<FileText className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-warning-400 to-warning-600" />
        <StatCard label="Active Quizzes" value={upcomingQuizzes.length} icon={<ClipboardList className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-purple-400 to-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Donut */}
        <Card>
          <CardHeader><h2 className="section-title">Attendance Overview</h2></CardHeader>
          <CardBody>
            {pieData.length > 0 ? (
              <div className="flex items-center justify-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={2} stroke="#fff">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-gray-600">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">No attendance data yet</p>
            )}
          </CardBody>
        </Card>

        {/* Pending Assignments */}
        <Card>
          <CardHeader><h2 className="section-title">Pending Assignments</h2></CardHeader>
          <CardBody className="space-y-3">
            {pendingAssignments.length === 0 ? (
              <p className="text-center text-gray-400 py-8">All caught up! 🎉</p>
            ) : (
              pendingAssignments.map((sub) => {
                const a = sub.assignment as unknown as Assignment;
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-sm font-medium">{a?.title}</p>
                      <p className="text-xs text-gray-500">Due: {a?.due_date ? formatDate(a.due_date) : '—'}</p>
                    </div>
                    <span className="text-xs font-medium text-warning-500">{a?.due_date ? getTimeRemaining(a.due_date) : ''}</span>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Quizzes */}
        <Card>
          <CardHeader><h2 className="section-title">Active Quizzes</h2></CardHeader>
          <CardBody className="space-y-3">
            {upcomingQuizzes.length === 0 ? (
              <p className="text-center text-gray-400 py-4">No active quizzes</p>
            ) : (
              upcomingQuizzes.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-medium">{q.title}</p>
                    <p className="text-xs text-gray-500">{(q.class as unknown as { name: string })?.name} • {q.duration_minutes} min</p>
                  </div>
                  <Badge variant="status" value="active">Active</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* AI Report Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-500" />
              <h2 className="section-title">AI Performance Summary</h2>
            </div>
          </CardHeader>
          <CardBody>
            {aiReport ? (
              <div className="text-sm text-gray-700 leading-relaxed max-h-48 overflow-y-auto">
                {aiReport.split('\n').slice(0, 6).map((line, i) => (
                  <p key={i} className="mb-1">{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4">No AI report generated yet</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
