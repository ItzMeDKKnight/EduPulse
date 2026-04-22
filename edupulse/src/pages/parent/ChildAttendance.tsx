import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAttendance } from '../../hooks/useAttendance';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AttendanceBar from '../../components/charts/AttendanceBar';
import { cn } from '../../lib/utils';
import type { Profile, Attendance, AttendanceChartData } from '../../types';

export default function ChildAttendance() {
  const { profile } = useAuth();
  const { getAttendanceSummary } = useAttendance();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile) loadChildren(); }, [profile]);

  async function loadChildren() {
    const { data } = await supabase.from('parent_student_links').select('student:profiles!student_id(*)').eq('parent_id', profile!.id);
    const kids = (data || []).map(d => d.student as unknown as Profile);
    setChildren(kids);
    if (kids.length > 0) { setSelectedChild(kids[0].id); loadAttendance(kids[0].id); }
    else setLoading(false);
  }

  async function loadAttendance(childId: string) {
    setLoading(true);
    const { data } = await supabase.from('attendance').select('*, class:classes!class_id(id, name, subject)').eq('student_id', childId).order('date', { ascending: false });
    setAttendance((data || []) as unknown as Attendance[]);
    setLoading(false);
  }

  useEffect(() => { if (selectedChild) loadAttendance(selectedChild); }, [selectedChild]);

  const summary = getAttendanceSummary(attendance);

  const months: Record<string, AttendanceChartData> = {};
  attendance.forEach(a => {
    const m = new Date(a.date).toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!months[m]) months[m] = { month: m, present: 0, absent: 0, late: 0 };
    if (a.status === 'present') months[m].present++;
    else if (a.status === 'absent') months[m].absent++;
    else if (a.status === 'late') months[m].late++;
  });

  // Calendar
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const attendanceMap: Record<string, string> = {};
  attendance.forEach(a => { attendanceMap[a.date] = a.status; });

  if (loading) return <LoadingSpinner fullPage text="Loading attendance..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Child's Attendance</h1>
          <p className="page-subtitle">Monitor attendance records</p>
        </div>
        {children.length > 1 && (
          <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="input-field w-auto">
            {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="stat-card text-center"><p className="text-2xl font-heading font-bold">{summary.total}</p><p className="text-xs text-gray-500">Total</p></div>
        <div className="stat-card text-center"><p className="text-2xl font-heading font-bold text-green-600">{summary.present}</p><p className="text-xs text-gray-500">Present</p></div>
        <div className="stat-card text-center"><p className="text-2xl font-heading font-bold text-red-600">{summary.absent}</p><p className="text-xs text-gray-500">Absent</p></div>
        <div className="stat-card text-center"><p className="text-2xl font-heading font-bold text-yellow-600">{summary.late}</p><p className="text-xs text-gray-500">Late</p></div>
        <div className="stat-card text-center">
          <p className="text-2xl font-heading font-bold text-primary-600">{summary.percentage}%</p><p className="text-xs text-gray-500">Rate</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full" style={{ width: `${summary.percentage}%` }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="section-title">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-xs font-medium text-gray-400 py-2">{d}</div>)}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const status = attendanceMap[dateStr];
                return (
                  <div key={day} className={cn('aspect-square flex items-center justify-center rounded-lg text-sm font-medium border', status === 'present' && 'cal-present', status === 'absent' && 'cal-absent', status === 'late' && 'cal-late', status === 'excused' && 'cal-excused', !status && 'bg-white border-gray-100 text-gray-400')}>{day}</div>
                );
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="section-title">Monthly Breakdown</h2></CardHeader>
          <CardBody><AttendanceBar data={Object.values(months)} /></CardBody>
        </Card>
      </div>
    </div>
  );
}
