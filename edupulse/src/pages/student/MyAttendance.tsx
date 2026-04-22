import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAttendance } from '../../hooks/useAttendance';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AttendanceBar from '../../components/charts/AttendanceBar';
import { cn } from '../../lib/utils';
import type { Attendance, AttendanceChartData } from '../../types';

export default function MyAttendance() {
  const { profile } = useAuth();
  const { fetchStudentAttendance, getAttendanceSummary, attendance, loading } = useAttendance();
  const [chartData, setChartData] = useState<AttendanceChartData[]>([]);

  useEffect(() => {
    if (profile) {
      fetchStudentAttendance(profile.id).then(() => {});
    }
  }, [profile]);

  useEffect(() => {
    // Build chart data by month
    const months: Record<string, AttendanceChartData> = {};
    attendance.forEach((a) => {
      const month = new Date(a.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!months[month]) months[month] = { month, present: 0, absent: 0, late: 0 };
      if (a.status === 'present') months[month].present++;
      else if (a.status === 'absent') months[month].absent++;
      else if (a.status === 'late') months[month].late++;
    });
    setChartData(Object.values(months));
  }, [attendance]);

  if (loading) return <LoadingSpinner fullPage text="Loading attendance..." />;

  const summary = getAttendanceSummary(attendance);

  // Build calendar (current month)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const attendanceMap: Record<string, string> = {};
  attendance.forEach((a) => { attendanceMap[a.date] = a.status; });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Attendance</h1>
        <p className="page-subtitle">Track your attendance records</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="stat-card text-center">
          <p className="text-2xl font-heading font-bold">{summary.total}</p>
          <p className="text-xs text-gray-500">Total Days</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-heading font-bold text-green-600">{summary.present}</p>
          <p className="text-xs text-gray-500">Present</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-heading font-bold text-red-600">{summary.absent}</p>
          <p className="text-xs text-gray-500">Absent</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-heading font-bold text-yellow-600">{summary.late}</p>
          <p className="text-xs text-gray-500">Late</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-heading font-bold text-primary-600">{summary.percentage}%</p>
          <p className="text-xs text-gray-500">Attendance</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${summary.percentage}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <h2 className="section-title">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-xs font-medium text-gray-400 py-2">{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const status = attendanceMap[dateStr];
                return (
                  <div
                    key={day}
                    className={cn(
                      'aspect-square flex items-center justify-center rounded-lg text-sm font-medium border cursor-default transition-colors',
                      status === 'present' && 'cal-present',
                      status === 'absent' && 'cal-absent',
                      status === 'late' && 'cal-late',
                      status === 'excused' && 'cal-excused',
                      !status && 'bg-white border-gray-100 text-gray-400'
                    )}
                    title={status || 'No record'}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200" /> Absent</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200" /> Late</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200" /> Excused</span>
            </div>
          </CardBody>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader><h2 className="section-title">Monthly Breakdown</h2></CardHeader>
          <CardBody>
            <AttendanceBar data={chartData} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
