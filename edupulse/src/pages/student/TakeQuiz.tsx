import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useQuizzes } from '../../hooks/useQuizzes';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Clock, CheckCircle2, XCircle, Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import type { Quiz, QuizQuestion, QuizAttempt } from '../../types';

export default function TakeQuiz() {
  const { profile } = useAuth();
  const { fetchAllQuizzesForStudent, fetchQuestions, startAttempt, submitAttempt, quizzes, questions, loading } = useQuizzes();
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<{ score: number; totalMarks: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (profile) fetchAllQuizzesForStudent(profile.id);
  }, [profile]);

  useEffect(() => {
    if (timeLeft > 0 && !result) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && attempt && !result) {
      handleSubmit();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, result]);

  async function handleStart(quiz: Quiz) {
    if (!profile) return;
    try {
      const att = await startAttempt(quiz.id, profile.id);
      if (att.submitted_at) {
        toast.error('You have already attempted this quiz');
        return;
      }
      const q = await fetchQuestions(quiz.id);
      setActiveQuiz(quiz);
      setAttempt(att);
      setAnswers({});
      setResult(null);
      setTimeLeft(quiz.duration_minutes * 60);
    } catch { toast.error('Failed to start quiz'); }
  }

  async function handleSubmit() {
    if (!attempt || !questions.length) return;
    try {
      const res = await submitAttempt(attempt.id, answers, questions);
      setResult(res);
      if (timerRef.current) clearTimeout(timerRef.current);
      toast.success('Quiz submitted!');
    } catch { toast.error('Failed to submit'); }
  }

  function formatTimer(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  if (loading) return <LoadingSpinner fullPage text="Loading quizzes..." />;

  // Quiz List View
  if (!activeQuiz) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Quizzes</h1>
          <p className="page-subtitle">View and attempt available quizzes</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => (
            <Card key={q.id} hover>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{q.title}</h3>
                  <Badge variant="status" value={q.status}>{q.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">{(q.class as unknown as { name: string })?.name}</p>
                <p className="text-xs text-gray-400 mt-1">{q.duration_minutes} minutes</p>
                {q.description && <p className="text-xs text-gray-500 mt-2">{q.description}</p>}
                {q.status === 'active' && (
                  <Button className="w-full mt-4" icon={<Play size={16} />} onClick={() => handleStart(q)}>
                    Start Quiz
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
          {quizzes.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <p>No quizzes available</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Result View
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card>
          <CardBody className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-primary-500" />
            </div>
            <h2 className="text-2xl font-heading font-bold">{activeQuiz.title}</h2>
            <p className="text-4xl font-heading font-bold text-primary-600 mt-4">{result.score}/{result.totalMarks}</p>
            <p className="text-gray-500 mt-2">{Math.round((result.score / result.totalMarks) * 100)}% Score</p>

            <div className="mt-8 space-y-3 text-left">
              {questions.map((q, i) => {
                const isCorrect = answers[q.id] === q.correct_option;
                return (
                  <div key={q.id} className={cn('p-4 rounded-lg border', isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                    <div className="flex items-start gap-2">
                      {isCorrect ? <CheckCircle2 size={16} className="text-green-600 mt-0.5" /> : <XCircle size={16} className="text-red-600 mt-0.5" />}
                      <div>
                        <p className="text-sm font-medium">Q{i + 1}: {q.question_text}</p>
                        <p className="text-xs text-gray-500 mt-1">Your answer: {answers[q.id] || 'Not answered'} | Correct: {q.correct_option}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button className="mt-6" onClick={() => { setActiveQuiz(null); setResult(null); }}>Back to Quizzes</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Quiz Taking View
  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      {/* Sticky Timer */}
      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur-lg rounded-xl shadow-card border border-gray-100 p-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-gray-900">{activeQuiz.title}</h2>
          <p className="text-xs text-gray-500">{questions.length} questions</p>
        </div>
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold', timeLeft < 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-primary-100 text-primary-700')}>
          <Clock size={18} />
          {formatTimer(timeLeft)}
        </div>
      </div>

      {/* Questions */}
      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardBody>
            <p className="text-sm font-medium text-gray-900 mb-4">
              <span className="text-primary-500 font-bold">Q{i + 1}.</span> {q.question_text}
              <span className="text-xs text-gray-400 ml-2">({q.marks} marks)</span>
            </p>
            <div className="space-y-2">
              {[
                { key: 'A', text: q.option_a },
                { key: 'B', text: q.option_b },
                ...(q.option_c ? [{ key: 'C', text: q.option_c }] : []),
                ...(q.option_d ? [{ key: 'D', text: q.option_d }] : []),
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setAnswers({ ...answers, [q.id]: opt.key })}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border text-sm transition-all',
                    answers[q.id] === opt.key
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <span className="font-medium mr-2">{opt.key}.</span>
                  {opt.text}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}

      <Button onClick={handleSubmit} className="w-full" variant="secondary" size="lg">
        Submit Quiz
      </Button>
    </div>
  );
}
