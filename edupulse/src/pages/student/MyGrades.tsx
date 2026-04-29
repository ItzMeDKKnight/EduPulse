import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMarks } from '../../hooks/useMarks';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PerformanceRadar from '../../components/charts/PerformanceRadar';
import MarksLineChart from '../../components/charts/MarksLineChart';
import { Brain, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Mark, SubjectPerformance } from '../../types';

export default function MyGrades() {
  const { profile } = useAuth();
  const { fetchMarksByStudent, generateReport, fetchLatestReport, marks, loading } = useMarks();
  const [radarData, setRadarData] = useState<SubjectPerformance[]>([]);
  const [lineData, setLineData] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchMarksByStudent(profile.id);
      fetchLatestReport(profile.id).then(r => { if (r) setReport(r.report_text); });
    }
  }, [profile]);

  useEffect(() => {
    if (marks.length === 0) return;

    // Radar: avg percentage per subject
    const subjectMap: Record<string, { total: number; count: number }> = {};
    marks.forEach((m) => {
      if (!subjectMap[m.subject]) subjectMap[m.subject] = { total: 0, count: 0 };
      subjectMap[m.subject].total += (m.marks_obtained / m.max_marks) * 100;
      subjectMap[m.subject].count++;
    });

    const radar = Object.entries(subjectMap).map(([subject, { total, count }]) => ({
      subject,
      percentage: Math.round(total / count),
      fullMark: 100,
    }));
    setRadarData(radar);
    setSubjects(Object.keys(subjectMap));

    // Line: marks over time per subject
    const dateMap: Record<string, any> = {};
    marks.forEach((m) => {
      const date = m.exam_date || m.created_at.split('T')[0];
      if (!dateMap[date]) dateMap[date] = { date };
      dateMap[date][m.subject] = Math.round((m.marks_obtained / m.max_marks) * 100);
    });
    setLineData(Object.values(dateMap).sort((a, b) => String(a.date).localeCompare(String(b.date))));
  }, [marks]);

  async function handleGenerateReport() {
    if (!profile) return;
    setGenerating(true);
    try {
      const text = await generateReport(profile.id, profile.full_name);
      setReport(text);
      toast.success('Report generated!');
    } catch { toast.error('Failed to generate report'); }
    setGenerating(false);
  }

  if (loading) return <LoadingSpinner fullPage text="Loading grades..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Grades & Performance</h1>
        <p className="page-subtitle">Visualize your academic progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              <h2 className="section-title">Subject Performance</h2>
            </div>
          </CardHeader>
          <CardBody>
            <PerformanceRadar data={radarData} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="section-title">Marks Trend</h2></CardHeader>
          <CardBody>
            <MarksLineChart data={lineData as { date: string; [key: string]: string | number }[]} subjects={subjects} />
          </CardBody>
        </Card>
      </div>

      {/* AI Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-500" />
              <h2 className="section-title">AI Performance Report</h2>
            </div>
            <Button size="sm" icon={<Brain size={14} />} loading={generating} onClick={handleGenerateReport}>
              {report ? 'Regenerate' : 'Generate Report'}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {report ? (
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {report}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Click "Generate Report" to get AI-powered insights</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Marks Table */}
      <Card>
        <CardHeader><h2 className="section-title">All Marks</h2></CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Exam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">%</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {marks.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium">{m.subject}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{m.exam_type}</td>
                    <td className="px-4 py-3 text-sm">{m.marks_obtained}/{m.max_marks}</td>
                    <td className="px-4 py-3 text-sm font-medium">{Math.round((m.marks_obtained / m.max_marks) * 100)}%</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.exam_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {marks.length === 0 && <p className="text-center text-gray-400 py-8">No marks recorded yet</p>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
