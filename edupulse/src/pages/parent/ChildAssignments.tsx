import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardBody } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { FileText } from 'lucide-react';
import { formatDate, getTimeRemaining, cn } from '../../lib/utils';
import type { Profile, AssignmentSubmission, Assignment } from '../../types';

export default function ChildAssignments() {
  const { profile } = useAuth();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile) loadChildren(); }, [profile]);

  async function loadChildren() {
    const { data } = await supabase.from('parent_student_links').select('student:profiles!student_id(*)').eq('parent_id', profile!.id);
    const kids = (data || []).map(d => d.student as unknown as Profile);
    setChildren(kids);
    if (kids.length > 0) { setSelectedChild(kids[0].id); loadAssignments(kids[0].id); }
    else setLoading(false);
  }

  async function loadAssignments(childId: string) {
    setLoading(true);
    const { data } = await supabase.from('assignment_submissions').select('*, assignment:assignments!assignment_id(*, class:classes!class_id(id, name, subject))').eq('student_id', childId).order('created_at', { ascending: false });
    setSubmissions((data || []) as unknown as AssignmentSubmission[]);
    setLoading(false);
  }

  useEffect(() => { if (selectedChild) loadAssignments(selectedChild); }, [selectedChild]);

  if (loading) return <LoadingSpinner fullPage text="Loading assignments..." />;

  function getStatusColor(status: string, dueDate?: string) {
    if (status === 'graded') return 'border-blue-200 bg-blue-50';
    if (status === 'submitted') return 'border-green-200 bg-green-50';
    if (status === 'pending' && dueDate && new Date(dueDate) < new Date()) return 'border-red-300 bg-red-50';
    if (status === 'pending') return 'border-yellow-200 bg-yellow-50';
    return 'border-gray-200 bg-gray-50';
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Child's Assignments</h1>
          <p className="page-subtitle">Track assignment submissions</p>
        </div>
        {children.length > 1 && (
          <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="input-field w-auto">
            {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {submissions.map((sub) => {
          const a = sub.assignment as unknown as Assignment & { class: { name: string; subject: string } };
          const overdue = sub.status === 'pending' && a?.due_date && new Date(a.due_date) < new Date();
          return (
            <Card key={sub.id} hover>
              <CardBody className={cn('border-l-4', getStatusColor(sub.status, a?.due_date))}>
                <div className="flex items-start justify-between mb-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <Badge variant="status" value={overdue ? 'late' : sub.status}>{overdue ? 'Overdue' : sub.status}</Badge>
                </div>
                <h3 className="font-medium text-gray-900">{a?.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{a?.class?.name} • {a?.class?.subject}</p>
                {a?.due_date && (
                  <p className={cn('text-xs mt-2', overdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
                    Due: {formatDate(a.due_date)} • {getTimeRemaining(a.due_date)}
                  </p>
                )}
                {sub.status === 'graded' && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-700">Score: {sub.marks_obtained}/{a?.max_marks}</p>
                    {sub.feedback && <p className="text-xs text-blue-600 mt-0.5">{sub.feedback}</p>}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
        {submissions.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No assignments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
