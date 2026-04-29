import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useQuizzes } from '../../hooks/useQuizzes';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DataTable from '../../components/ui/Table';
import { Plus, Trash2, ArrowUp, ArrowDown, Play, Square, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Class, Quiz, QuizQuestion, QuizAttempt, Profile } from '../../types';

export default function QuizBuilder() {
  const { profile } = useAuth();
  const { createQuiz, addQuestion, deleteQuestion, activateQuiz, closeQuiz, fetchQuestions, fetchAttempts, questions, attempts, loading: hookLoading } = useQuizzes();
  const [classes, setClasses] = useState<Class[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizForm, setQuizForm] = useState({ class_id: '', title: '', description: '', duration_minutes: 30, start_time: '', end_time: '' });
  const [qForm, setQForm] = useState({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1 });

  useEffect(() => { if (profile) loadData(); }, [profile]);

  async function loadData() {
    const [{ data: cls }, { data: qz }] = await Promise.all([
      supabase.from('classes').select('*').eq('teacher_id', profile!.id),
      supabase.from('quizzes').select('*, class:classes!class_id(id, name, subject)').eq('created_by', profile!.id).order('created_at', { ascending: false }),
    ]);
    setClasses((cls || []) as Class[]);
    setQuizzes((qz || []) as unknown as Quiz[]);
    setLoading(false);
  }

  async function handleCreateQuiz() {
    if (!quizForm.class_id || !quizForm.title || !quizForm.start_time || !quizForm.end_time) {
      toast.error('Please fill all required fields, including timings');
      return;
    }
    try {
      console.log('Creating quiz with data:', quizForm);
      const quiz = await createQuiz({ ...quizForm, created_by: profile!.id });
      toast.success('Quiz created!');
      setSelectedQuiz(quiz as unknown as Quiz);
      setStep(2);
    } catch (err: any) { 
      console.error('Quiz creation error:', err);
      toast.error(err.message || 'Failed to create quiz'); 
    }
  }

  async function handleAddQuestion() {
    if (!selectedQuiz) return;
    try {
      await addQuestion(selectedQuiz.id, { ...qForm, order_index: questions.length });
      await fetchQuestions(selectedQuiz.id);
      setQForm({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1 });
      toast.success('Question added!');
    } catch { toast.error('Failed to add question'); }
  }

  async function handleDeleteQuestion(id: string) {
    await deleteQuestion(id);
    if (selectedQuiz) fetchQuestions(selectedQuiz.id);
    toast.success('Deleted');
  }

  async function handleActivate() {
    if (!selectedQuiz) return;
    await activateQuiz(selectedQuiz.id);
    toast.success('Quiz activated!');
    setShowCreate(false);
    setShowQuestions(false);
    setStep(1);
    loadData();
  }

  async function handleClose(quizId: string) {
    await closeQuiz(quizId);
    toast.success('Quiz closed');
    loadData();
  }

  async function viewResults(quiz: Quiz) {
    setSelectedQuiz(quiz);
    await fetchAttempts(quiz.id);
    setShowResults(true);
  }

  async function openQuestions(quiz: Quiz) {
    setSelectedQuiz(quiz);
    await fetchQuestions(quiz.id);
    setShowQuestions(true);
  }

  if (loading) return <LoadingSpinner fullPage text="Loading quizzes..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Quiz Builder</h1>
          <p className="page-subtitle">Create and manage quizzes</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => { setShowCreate(true); setStep(1); }}>New Quiz</Button>
      </div>

      {/* Quiz List */}
      <Card>
        <DataTable
          columns={[
            { key: 'title', label: 'Title', sortable: true },
            { key: 'class', label: 'Class', render: (item) => ((item.class as unknown as Class)?.name || '—') },
            { key: 'status', label: 'Status', render: (item) => <Badge variant="status" value={String(item.status)}>{String(item.status)}</Badge> },
            { key: 'duration_minutes', label: 'Duration', render: (item) => `${item.duration_minutes} min` },
            {
              key: 'actions', label: 'Actions',
              render: (item) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => openQuestions(item as unknown as Quiz)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="View Questions"><Eye size={16} /></button>
                  {String(item.status) === 'draft' && (
                    <>
                      <button onClick={() => { setSelectedQuiz(item as unknown as Quiz); setStep(2); fetchQuestions(String(item.id)); setShowCreate(true); }} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500" title="Add Questions"><Plus size={16} /></button>
                      <button onClick={() => { setSelectedQuiz(item as unknown as Quiz); handleActivate(); }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Activate"><Play size={16} /></button>
                    </>
                  )}
                  {String(item.status) === 'active' && (
                    <button onClick={() => handleClose(String(item.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Close"><Square size={16} /></button>
                  )}
                  <button onClick={() => viewResults(item as unknown as Quiz)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="Results">📊</button>
                </div>
              ),
            },
          ]}
          data={quizzes as unknown as Record<string, unknown>[]}
          searchKeys={['title']}
        />
      </Card>

      {/* Create Quiz Modal (3-step) */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={`Quiz Builder — Step ${step}/3`} size="lg">
        {step === 1 && (
          <div className="space-y-4">
            <div><label className="label">Class</label><select value={quizForm.class_id} onChange={(e) => setQuizForm({...quizForm, class_id: e.target.value})} className="input-field"><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Title</label><input value={quizForm.title} onChange={(e) => setQuizForm({...quizForm, title: e.target.value})} className="input-field" /></div>
            <div><label className="label">Description</label><textarea value={quizForm.description} onChange={(e) => setQuizForm({...quizForm, description: e.target.value})} className="input-field" rows={2} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="label">Duration (min)</label><input type="number" value={quizForm.duration_minutes} onChange={(e) => setQuizForm({...quizForm, duration_minutes: parseInt(e.target.value)})} className="input-field" /></div>
              <div><label className="label">Start Time</label><input type="datetime-local" value={quizForm.start_time} onChange={(e) => setQuizForm({...quizForm, start_time: e.target.value})} className="input-field" /></div>
              <div><label className="label">End Time</label><input type="datetime-local" value={quizForm.end_time} onChange={(e) => setQuizForm({...quizForm, end_time: e.target.value})} className="input-field" /></div>
            </div>
            <Button onClick={handleCreateQuiz} className="w-full">Next — Add Questions →</Button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
              <div><label className="label">Question</label><textarea value={qForm.question_text} onChange={(e) => setQForm({...qForm, question_text: e.target.value})} className="input-field" rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Option A</label><input value={qForm.option_a} onChange={(e) => setQForm({...qForm, option_a: e.target.value})} className="input-field" /></div>
                <div><label className="label">Option B</label><input value={qForm.option_b} onChange={(e) => setQForm({...qForm, option_b: e.target.value})} className="input-field" /></div>
                <div><label className="label">Option C</label><input value={qForm.option_c} onChange={(e) => setQForm({...qForm, option_c: e.target.value})} className="input-field" /></div>
                <div><label className="label">Option D</label><input value={qForm.option_d} onChange={(e) => setQForm({...qForm, option_d: e.target.value})} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Correct Answer</label><select value={qForm.correct_option} onChange={(e) => setQForm({...qForm, correct_option: e.target.value})} className="input-field"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div>
                <div><label className="label">Marks</label><input type="number" value={qForm.marks} onChange={(e) => setQForm({...qForm, marks: parseInt(e.target.value)})} className="input-field" /></div>
              </div>
              <Button onClick={handleAddQuestion} icon={<Plus size={16} />} className="w-full">Add Question</Button>
            </div>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-200">
                  <span className="text-xs font-bold text-gray-400 mt-1">Q{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm">{q.question_text}</p>
                    <p className="text-xs text-gray-500 mt-1">A: {q.option_a} | B: {q.option_b}{q.option_c ? ` | C: ${q.option_c}` : ''}{q.option_d ? ` | D: ${q.option_d}` : ''} | ✓ {q.correct_option} | {q.marks}pt</p>
                  </div>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            {questions.length > 0 && <Button onClick={() => setStep(3)} className="w-full" variant="secondary">Review & Publish →</Button>}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="p-6 bg-gray-50 rounded-xl">
              <p className="text-3xl font-heading font-bold text-gray-900">{questions.length}</p>
              <p className="text-sm text-gray-500">Questions</p>
              <p className="text-lg font-heading font-semibold text-primary-600 mt-2">{questions.reduce((s, q) => s + q.marks, 0)} Total Marks</p>
              <p className="text-sm text-gray-500 mt-1">{selectedQuiz?.duration_minutes} minutes</p>
            </div>
            <Button onClick={handleActivate} className="w-full" variant="secondary" icon={<Play size={18} />}>Activate Quiz</Button>
          </div>
        )}
      </Modal>

      {/* Questions View Modal */}
      <Modal isOpen={showQuestions} onClose={() => setShowQuestions(false)} title={`Questions — ${selectedQuiz?.title || ''}`} size="lg">
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-sm font-medium">Q{i + 1}: {q.question_text}</p>
              <p className="text-xs text-gray-500 mt-1">A: {q.option_a} | B: {q.option_b}{q.option_c ? ` | C: ${q.option_c}` : ''}{q.option_d ? ` | D: ${q.option_d}` : ''}</p>
              <p className="text-xs text-secondary-600 mt-1">Correct: {q.correct_option} | {q.marks} marks</p>
            </div>
          ))}
          {questions.length === 0 && <p className="text-center text-gray-400 py-6">No questions</p>}
        </div>
      </Modal>

      {/* Results Modal */}
      <Modal isOpen={showResults} onClose={() => setShowResults(false)} title={`Results — ${selectedQuiz?.title || ''}`} size="lg">
        <DataTable
          columns={[
            { key: 'student', label: 'Student', render: (item) => ((item.student as unknown as Profile)?.full_name || '—') },
            { key: 'score', label: 'Score', sortable: true, render: (item) => `${item.score || 0}/${item.total_marks || 0}` },
            { key: 'submitted_at', label: 'Submitted', render: (item) => item.submitted_at ? new Date(String(item.submitted_at)).toLocaleString() : 'In Progress' },
          ]}
          data={attempts as unknown as Record<string, unknown>[]}
          searchKeys={[]}
          exportable
          exportFilename="quiz-results"
        />
      </Modal>
    </div>
  );
}
