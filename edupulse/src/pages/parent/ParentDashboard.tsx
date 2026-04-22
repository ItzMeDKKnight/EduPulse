import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAttendance } from '../../hooks/useAttendance';
import { useMarks } from '../../hooks/useMarks';
import { StatCard, Card, CardHeader, CardBody } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import { CalendarCheck, FileText, ClipboardList, Brain, AlertTriangle, User } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { Profile, Attendance, AssignmentSubmission, Quiz } from '../../types';

export default function ParentDashboard() {
  const { profile } = useAuth();
  const { getAttendanceSummary } = useAttendance();
  const { fetchLatestReport } = useMarks();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<AssignmentSubmission[]>([]);
  const [activeQuizzes, setActiveQuizzes] = useState<Quiz[]>([]);
  const [aiReport, setAiReport] = useState<string | null>(null);

  useEffect(() => {
    if (profile) loadChildren();
  }, [profile]);

  async function loadChildren() {
    const { data } = await supabase
      .from('parent_student_links')
      .select('student:profiles!student_id(*)')
      .eq('parent_id', profile!.id);
    const kids = (data || []).map((d) => d.student as unknown as Profile);
    setChildren(kids);
    if (kids.length > 0) {
      setSelectedChild(kids[0]);
      loadChildData(kids[0].id);
    } else {
      setLoading(false);
    }
  }

  async function loadChildData(childId: string) {
    setLoading(true);
    try {
      const [{ data: att }, { data: subs }, { data: enrollments }] = await Promise.all([
        supabase.from('attendance').select('*').eq('student_id', childId),
        supabase.from('assignment_submissions').select('*, assignment:assignments!assignment_id(*)').eq('student_id', childId).eq('status', 'pending'),
        supabase.from('enrollments').select('class_id').eq('student_id', childId),
      ]);

      setAttendance((att || []) as unknown as Attendance[]);
      setPendingAssignments((subs || []) as unknown as AssignmentSubmission[]);

      if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map(e => e.class_id);
        const { data: quizzes } = await supabase.from('quizzes').select('*, class:classes!class_id(id, name)').in('class_id', classIds).eq('status', 'active');
        setActiveQuizzes((quizzes || []) as unknown as Quiz[]);
      }

      const report = await fetchLatestReport(childId);
      setAiReport(report?.report_text || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleChildSelect(child: Profile) {
    setSelectedChild(child);
    loadChildData(child.id);
  }

  // Subscribe to real-time attendance changes
  useEffect(() => {
    if (!selectedChild) return;
    const channel = supabase
      .channel('parent-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${selectedChild.id}` }, () => {
        loadChildData(selectedChild.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChild]);

  if (loading && children.length === 0) return <LoadingSpinner fullPage text="Loading..." />;

  if (children.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="page-title">Parent Dashboard</h1>
        <Card><CardBody className="text-center py-12">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No children linked to your account</p>
          <p className="text-xs text-gray-400 mt-1">Link a child during registration or contact admin</p>
        </CardBody></Card>
      </div>
    );
  }

  const summary = getAttendanceSummary(attendance);
  const hasAbsentToday = attendance.some(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'absent');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Parent Dashboard</h1>
          <p className="page-subtitle">Monitor your child's academic progress</p>
        </div>
        {children.length > 1 && (
          <select
            value={selectedChild?.id}
            onChange={(e) => {
              const child = children.find(c => c.id === e.target.value);
              if (child) handleChildSelect(child);
            }}
            className="input-field w-auto"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
      </div>

      {hasAbsentToday && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Absent Today</p>
            <p className="text-xs text-red-500">{selectedChild?.full_name} was marked absent today</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attendance %" value={`${summary.percentage}%`} icon={<CalendarCheck className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-secondary-400 to-secondary-600" />
        <StatCard label="Days Present" value={summary.present} icon={<CalendarCheck className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-primary-400 to-primary-600" />
        <StatCard label="Pending Tasks" value={pendingAssignments.length} icon={<FileText className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-warning-400 to-warning-600" />
        <StatCard label="Active Quizzes" value={activeQuizzes.length} icon={<ClipboardList className="w-6 h-6 text-white" />} color="bg-gradient-to-br from-purple-400 to-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="section-title">Pending Assignments</h2></CardHeader>
          <CardBody className="space-y-3">
            {pendingAssignments.length === 0 ? (
              <p className="text-center text-gray-400 py-4">All assignments submitted! ✅</p>
            ) : (
              pendingAssignments.map(sub => {
                const a = sub.assignment as unknown as { title: string; due_date: string };
                return (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-red-700">{a?.title}</p>
                      <p className="text-xs text-red-500">Due: {a?.due_date ? formatDate(a.due_date) : '—'}</p>
                    </div>
                    <Badge className="bg-red-100 text-red-700">Not Submitted</Badge>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="section-title">Active Quizzes</h2></CardHeader>
          <CardBody className="space-y-3">
            {activeQuizzes.length === 0 ? (
              <p className="text-center text-gray-400 py-4">No active quizzes</p>
            ) : (
              activeQuizzes.map(q => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                  <div>
                    <p className="text-sm font-medium">{q.title}</p>
                    <p className="text-xs text-gray-500">{(q.class as unknown as { name: string })?.name}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700">⚠️ Pending</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* AI Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-500" />
            <h2 className="section-title">AI Performance Summary</h2>
          </div>
        </CardHeader>
        <CardBody>
          {aiReport ? (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {aiReport}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-6">No AI report available. Ask a teacher to generate one.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
