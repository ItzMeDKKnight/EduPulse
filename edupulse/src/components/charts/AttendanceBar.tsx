import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { AttendanceChartData } from '../../types';

interface AttendanceBarProps {
  data: AttendanceChartData[];
}

export default function AttendanceBar({ data }: AttendanceBarProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No attendance data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '13px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="present" fill="#0e9f6e" radius={[4, 4, 0, 0]} name="Present" />
        <Bar dataKey="absent" fill="#e02424" radius={[4, 4, 0, 0]} name="Absent" />
        <Bar dataKey="late" fill="#ff5a1f" radius={[4, 4, 0, 0]} name="Late" />
      </BarChart>
    </ResponsiveContainer>
  );
}
