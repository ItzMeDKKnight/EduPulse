import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useMarks } from '../../hooks/useMarks';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import PerformanceRadar from '../../components/charts/PerformanceRadar';
import MarksLineChart from '../../components/charts/MarksLineChart';
import { Brain, TrendingUp } from 'lucide-react';
import type { Profile, Mark, SubjectPerformance } from '../../types';

export default function ChildPerformance() {
  const { profile } = useAuth();
  const { fetchLatestReport, generateReport } = useMarks();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState<Profile | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [radarData, setRadarData] = useState<SubjectPerformance[]>([]);
  const [lineData, setLineData] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (profile) loadChildren(); }, [profile]);

  async function loadChildren() {
    const { data } = await supabase.from('parent_student_links').select('student:profiles!student_id(*)').eq('parent_id', profile!.id);
    const kids = (data || []).map(d => d.student as unknown as Profile);
    setChildren(kids);
    if (kids.length > 0) { setSelectedChild(kids[0]); loadData(kids[0]); }
    else setLoading(false);
  }

  async function loadData(child: Profile) {
    setLoading(true);
    const [{ data: marksData }, reportData] = await Promise.all([
      supabase.from('marks').select('*').eq('student_id', child.id).order('exam_date', { ascending: false }),
      fetchLatestReport(child.id),
    ]);

    const m = (marksData || []) as unknown as Mark[];
    setMarks(m);
    setReport(reportData?.report_text || null);

    // Process charts
    const subjectMap: Record<string, { total: number; count: number }> = {};
    m.forEach(mk => {
      if (!subjectMap[mk.subject]) subjectMap[mk.subject] = { total: 0, count: 0 };
      subjectMap[mk.subject].total += (mk.marks_obtained / mk.max_marks) * 100;
      subjectMap[mk.subject].count++;
    });
    setRadarData(Object.entries(subjectMap).map(([subject, { total, count }]) => ({ subject, percentage: Math.round(total / count), fullMark: 100 })));
    setSubjects(Object.keys(subjectMap));

    const dateMap: Record<string, Record<string, unknown>> = {};
    m.forEach(mk => {
      const date = mk.exam_date || mk.created_at.split('T')[0];
      if (!dateMap[date]) dateMap[date] = { date };
      dateMap[date][mk.subject] = Math.round((mk.marks_obtained / mk.max_marks) * 100);
    });
    setLineData(Object.values(dateMap).sort((a, b) => String(a.date).localeCompare(String(b.date))));
    setLoading(false);
  }

  async function handleGenerate() {
    if (!selectedChild) return;
    setGenerating(true);
    try {
      const text = await generateReport(selectedChild.id, selectedChild.full_name);
      setReport(text);
    } catch {}
    setGenerating(false);
  }

  if (loading) return <LoadingSpinner fullPage text="Loading performance..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Child's Performance</h1>
          <p className="page-subtitle">Comprehensive academic analysis</p>
        </div>
        {children.length > 1 && (
          <select value={selectedChild?.id} onChange={e => { const c = children.find(ch => ch.id === e.target.value); if (c) { setSelectedChild(c); loadData(c); } }} className="input-field w-auto">
            {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-500" /><h2 className="section-title">Subject Performance</h2></div></CardHeader>
          <CardBody><PerformanceRadar data={radarData} /></CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="section-title">Marks Trend</h2></CardHeader>
          <CardBody><MarksLineChart data={lineData as { date: string; [key: string]: string | number }[]} subjects={subjects} /></CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary-500" /><h2 className="section-title">AI Performance Report</h2></div>
            <Button size="sm" icon={<Brain size={14} />} loading={generating} onClick={handleGenerate}>{report ? 'Regenerate' : 'Generate'}</Button>
          </div>
        </CardHeader>
        <CardBody>
          {report ? (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{report}</div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Click Generate to get AI-powered insights</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
