import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAssignments } from '../../hooks/useAssignments';
import { Card, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Upload, FileText, Download } from 'lucide-react';
import { formatDate, getTimeRemaining, cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { AssignmentSubmission, Assignment } from '../../types';

export default function MyAssignments() {
  const { profile } = useAuth();
  const { fetchStudentAssignments, submitAssignment, uploadFile, submissions, loading } = useAssignments();
  const [tab, setTab] = useState<'pending' | 'submitted' | 'graded'>('pending');
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (profile) fetchStudentAssignments(profile.id);
  }, [profile]);

  const filtered = submissions.filter((s) => {
    if (tab === 'pending') return s.status === 'pending';
    if (tab === 'submitted') return s.status === 'submitted';
    if (tab === 'graded') return s.status === 'graded';
    return true;
  });

  async function handleUpload(sub: AssignmentSubmission, file: File) {
    const assignment = sub.assignment as unknown as Assignment;
    if (!assignment || !profile) return;
    setUploading(sub.id);
    try {
      const url = await uploadFile(assignment.id, profile.id, file);
      await submitAssignment(sub.id, url, file.name);
      toast.success('Assignment submitted!');
      fetchStudentAssignments(profile.id);
    } catch { toast.error('Upload failed'); }
    setUploading(null);
  }

  if (loading) return <LoadingSpinner fullPage text="Loading assignments..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">My Assignments</h1>
        <p className="page-subtitle">View and submit your assignments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['pending', 'submitted', 'graded'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t} ({submissions.filter(s => s.status === t).length})
          </button>
        ))}
      </div>

      {/* Assignment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sub) => {
          const a = sub.assignment as unknown as Assignment;
          return (
            <Card key={sub.id} hover>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <Badge variant="status" value={sub.status}>{sub.status}</Badge>
                </div>
                <h3 className="font-medium text-gray-900">{a?.title || 'Assignment'}</h3>
                <p className="text-xs text-gray-500 mt-1">Max: {a?.max_marks || 100} marks</p>
                {a?.due_date && (
                  <p className={cn('text-xs mt-1', getTimeRemaining(a.due_date) === 'Overdue' ? 'text-danger-500 font-medium' : 'text-warning-500')}>
                    {getTimeRemaining(a.due_date) === 'Overdue' ? '⚠️ Overdue' : `📅 ${getTimeRemaining(a.due_date)}`}
                  </p>
                )}
                {a?.due_date && <p className="text-xs text-gray-400 mt-0.5">Due: {formatDate(a.due_date)}</p>}

                {/* Pending: Upload button */}
                {sub.status === 'pending' && (
                  <div className="mt-4">
                    <label className="btn-primary text-sm cursor-pointer inline-flex items-center gap-2 w-full justify-center">
                      {uploading === sub.id ? <LoadingSpinner size="sm" /> : <Upload size={16} />}
                      Upload Submission
                      <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(sub, e.target.files[0])} />
                    </label>
                  </div>
                )}

                {/* Submitted: Show file */}
                {sub.status === 'submitted' && sub.file_url && (
                  <a href={sub.file_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-primary-500 hover:underline">
                    <Download size={12} /> {sub.file_name || 'View File'}
                  </a>
                )}

                {/* Graded: Show marks */}
                {sub.status === 'graded' && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-sm font-medium text-green-700">Score: {sub.marks_obtained}/{a?.max_marks}</p>
                    {sub.feedback && <p className="text-xs text-green-600 mt-1">{sub.feedback}</p>}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No {tab} assignments</p>
          </div>
        )}
      </div>
    </div>
  );
}
