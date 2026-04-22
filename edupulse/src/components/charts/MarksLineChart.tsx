import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MarksData {
  date: string;
  [subject: string]: string | number;
}

interface MarksLineChartProps {
  data: MarksData[];
  subjects: string[];
}

const COLORS = ['#1a56db', '#0e9f6e', '#ff5a1f', '#e02424', '#7c3aed', '#0891b2', '#ca8a04'];

export default function MarksLineChart({ data, subjects }: MarksLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No marks data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '13px',
          }}
          formatter={(value: number) => [`${value}%`]}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {subjects.map((subject, i) => (
          <Line
            key={subject}
            type="monotone"
            dataKey={subject}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
            activeDot={{ r: 6 }}
            name={subject}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
