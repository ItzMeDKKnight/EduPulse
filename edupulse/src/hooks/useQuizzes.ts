import { useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import type { Quiz, QuizQuestion, QuizAttempt } from '../types';

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQuizzesByClass = useCallback(async (classId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, class:classes!class_id(id, name, subject)')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setQuizzes((data || []) as unknown as Quiz[]);
    setLoading(false);
    return data;
  }, []);

  const fetchActiveQuizzes = useCallback(async (studentId: string) => {
    setLoading(true);
    // Get enrolled classes
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('student_id', studentId);

    if (!enrollments || enrollments.length === 0) {
      setQuizzes([]);
      setLoading(false);
      return [];
    }

    const classIds = enrollments.map((e) => e.class_id);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, class:classes!class_id(id, name, subject)')
      .in('class_id', classIds)
      .eq('status', 'active')
      .order('start_time', { ascending: true });
    if (error) throw error;
    setQuizzes((data || []) as unknown as Quiz[]);
    setLoading(false);
    return data;
  }, []);

  const fetchAllQuizzesForStudent = useCallback(async (studentId: string) => {
    setLoading(true);
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('student_id', studentId);

    if (!enrollments || enrollments.length === 0) {
      setQuizzes([]);
      setLoading(false);
      return [];
    }

    const classIds = enrollments.map((e) => e.class_id);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, class:classes!class_id(id, name, subject)')
      .in('class_id', classIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    setQuizzes((data || []) as unknown as Quiz[]);
    setLoading(false);
    return data;
  }, []);

  const fetchQuestions = useCallback(async (quizId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    setQuestions((data || []) as QuizQuestion[]);
    setLoading(false);
    return data as QuizQuestion[];
  }, []);

  const createQuiz = useCallback(async (quizData: {
    class_id: string;
    title: string;
    description: string;
    duration_minutes: number;
    start_time: string;
    end_time: string;
    created_by: string;
  }) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .insert({ ...quizData, status: 'draft' })
      .select()
      .single();
    if (error) throw error;
    setLoading(false);
    return data;
  }, []);

  const addQuestion = useCallback(async (quizId: string, question: {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    marks: number;
    order_index: number;
  }) => {
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert({ quiz_id: quizId, ...question })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const updateQuestion = useCallback(async (questionId: string, updates: Partial<QuizQuestion>) => {
    const { error } = await supabase
      .from('quiz_questions')
      .update(updates)
      .eq('id', questionId);
    if (error) throw error;
  }, []);

  const deleteQuestion = useCallback(async (questionId: string) => {
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId);
    if (error) throw error;
  }, []);

  const activateQuiz = useCallback(async (quizId: string) => {
    const { error } = await supabase
      .from('quizzes')
      .update({ status: 'active' })
      .eq('id', quizId);
    if (error) throw error;
  }, []);

  const closeQuiz = useCallback(async (quizId: string) => {
    const { error } = await supabase
      .from('quizzes')
      .update({ status: 'closed' })
      .eq('id', quizId);
    if (error) throw error;
  }, []);

  const startAttempt = useCallback(async (quizId: string, studentId: string) => {
    // Check if already attempted
    const { data: existing } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .single();

    if (existing) return existing as QuizAttempt;

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data as QuizAttempt;
  }, []);

  const submitAttempt = useCallback(async (
    attemptId: string,
    answers: Record<string, string>,
    questionsData: QuizQuestion[]
  ) => {
    let score = 0;
    let totalMarks = 0;

    questionsData.forEach((q) => {
      totalMarks += q.marks;
      if (answers[q.id] === q.correct_option) {
        score += q.marks;
      }
    });

    const { error } = await supabase
      .from('quiz_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score,
        total_marks: totalMarks,
        answers,
      })
      .eq('id', attemptId);
    if (error) throw error;
    return { score, totalMarks };
  }, []);

  const fetchAttempts = useCallback(async (quizId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*, student:profiles!student_id(id, full_name, email)')
      .eq('quiz_id', quizId)
      .order('score', { ascending: false });
    if (error) throw error;
    setAttempts((data || []) as unknown as QuizAttempt[]);
    setLoading(false);
    return data;
  }, []);

  const fetchStudentAttempts = useCallback(async (studentId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*, quiz:quizzes!quiz_id(*, class:classes!class_id(id, name, subject))')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });
    if (error) throw error;
    setAttempts((data || []) as unknown as QuizAttempt[]);
    setLoading(false);
    return data;
  }, []);

  return {
    quizzes,
    questions,
    attempts,
    loading,
    fetchQuizzesByClass,
    fetchActiveQuizzes,
    fetchAllQuizzesForStudent,
    fetchQuestions,
    createQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    activateQuiz,
    closeQuiz,
    startAttempt,
    submitAttempt,
    fetchAttempts,
    fetchStudentAttempts,
  };
}
