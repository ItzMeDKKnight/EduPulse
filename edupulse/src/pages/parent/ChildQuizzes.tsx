import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardBody } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ClipboardList } from 'lucide-react';
import type { Profile, Quiz, QuizAttempt } from '../../types';

export default function ChildQuizzes() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [quizzes, setQuizzes] = useState<(Quiz & { attempt?: QuizAttempt })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile) loadChildren(); }, [profile]);

  async function loadChildren() {
    const { data } = await supabase.from('parent_student_links').select('student:profiles!student_id(*)').eq('parent_id', profile!.id);
    const kids = (data || []).map(d => d.student as unknown as Profile);
    setChildren(kids);
    if (kids.length > 0) { setSelectedChild(kids[0].id); loadQuizzes(kids[0].id); }
    else setLoading(false);
  }

  async function loadQuizzes(childId: string) {
    setLoading(true);
    const { data: enrollments } = await supabase.from('enrollments').select('class_id').eq('student_id', childId);
    if (!enrollments || enrollments.length === 0) { setQuizzes([]); setLoading(false); return; }

    const classIds = enrollments.map(e => e.class_id);
    const [{ data: qz }, { data: attempts }] = await Promise.all([
      supabase.from('quizzes').select('*, class:classes!class_id(id, name, subject)').in('class_id', classIds).order('created_at', { ascending: false }),
      supabase.from('quiz_attempts').select('*').eq('student_id', childId),
    ]);

    const attemptMap: Record<string, QuizAttempt> = {};
    (attempts || []).forEach((a) => { attemptMap[(a as unknown as QuizAttempt).quiz_id] = a as unknown as QuizAttempt; });

    const combined = (qz || []).map(q => ({ ...q, attempt: attemptMap[q.id] })) as (Quiz & { attempt?: QuizAttempt })[];
    setQuizzes(combined);
    setLoading(false);
  }

  useEffect(() => { if (selectedChild) loadQuizzes(selectedChild); }, [selectedChild]);

  if (loading) return <LoadingSpinner fullPage text="Loading quizzes..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Child's Quizzes</h1>
          <p className="page-subtitle">Monitor quiz participation and scores</p>
        </div>
        {children.length > 1 && (
          <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="input-field w-auto">
            {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quizzes.map(q => {
          const hasAttempted = !!q.attempt?.submitted_at;
          const isPending = q.status === 'active' && !hasAttempted;
          return (
            <Card key={q.id} hover>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <ClipboardList className="w-5 h-5 text-gray-400" />
                  <Badge variant="status" value={q.status}>{q.status}</Badge>
                </div>
                <h3 className="font-medium text-gray-900">{q.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{(q.class as unknown as { name: string })?.name} • {q.duration_minutes} min</p>

                {isPending && (
                  <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs font-medium text-red-700">⚠️ Not Yet Attempted</p>
                  </div>
                )}

                {hasAttempted && q.status === 'closed' && (
                  <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs font-medium text-green-700">Score: {q.attempt!.score}/{q.attempt!.total_marks}</p>
                    <p className="text-xs text-green-600">{Math.round(((q.attempt!.score || 0) / (q.attempt!.total_marks || 1)) * 100)}%</p>
                  </div>
                )}

                {hasAttempted && q.status === 'active' && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-blue-700">✅ Submitted</p>
                  </div>
                )}

                {q.status === 'draft' && (
                  <p className="text-xs text-gray-400 mt-3">Upcoming quiz</p>
                )}
              </CardBody>
            </Card>
          );
        })}
        {quizzes.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No quizzes found</p>
          </div>
        )}
      </div>
    </div>
  );
}
