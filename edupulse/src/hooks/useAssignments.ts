import { useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import type { Assignment, AssignmentSubmission } from '../types';

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignmentsByClass = useCallback(async (classId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assignments')
      .select('*, class:classes!class_id(id, name, subject)')
      .eq('class_id', classId)
      .order('due_date', { ascending: false });
    if (error) throw error;
    setAssignments((data || []) as unknown as Assignment[]);
    setLoading(false);
    return data;
  }, []);

  const fetchStudentAssignments = useCallback(async (studentId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, assignment:assignments!assignment_id(*, class:classes!class_id(id, name, subject)), student:profiles!student_id(id, full_name)')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    setSubmissions((data || []) as unknown as AssignmentSubmission[]);
    setLoading(false);
    return data;
  }, []);

  const fetchSubmissionsByAssignment = useCallback(async (assignmentId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, student:profiles!student_id(id, full_name, email, avatar_url)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    setSubmissions((data || []) as unknown as AssignmentSubmission[]);
    setLoading(false);
    return data;
  }, []);

  const createAssignment = useCallback(async (
    classId: string,
    title: string,
    description: string,
    dueDate: string,
    maxMarks: number,
    createdBy: string
  ) => {
    setLoading(true);
    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert({ class_id: classId, title, description, due_date: dueDate, max_marks: maxMarks, created_by: createdBy })
      .select()
      .single();
    if (error) throw error;

    // Auto-create pending submissions for all enrolled students
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId);

    if (enrollments && enrollments.length > 0) {
      const subs = enrollments.map((e) => ({
        assignment_id: assignment.id,
        student_id: e.student_id,
        status: 'pending' as const,
      }));
      await supabase.from('assignment_submissions').insert(subs);
    }

    setLoading(false);
    return assignment;
  }, []);

  const submitAssignment = useCallback(async (
    submissionId: string,
    fileUrl: string,
    fileName: string
  ) => {
    setLoading(true);
    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        file_url: fileUrl,
        file_name: fileName,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      })
      .eq('id', submissionId);
    if (error) throw error;
    setLoading(false);
  }, []);

  const gradeSubmission = useCallback(async (
    submissionId: string,
    marksObtained: number,
    feedback: string,
    gradedBy: string
  ) => {
    setLoading(true);
    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        marks_obtained: marksObtained,
        feedback,
        graded_by: gradedBy,
        graded_at: new Date().toISOString(),
        status: 'graded',
      })
      .eq('id', submissionId);
    if (error) throw error;
    setLoading(false);
  }, []);

  const uploadFile = useCallback(async (
    assignmentId: string,
    studentId: string,
    file: File
  ): Promise<string> => {
    const filePath = `assignments/${assignmentId}/${studentId}/${file.name}`;
    const { error } = await supabase.storage
      .from('submissions')
      .upload(filePath, file, { upsert: true });
    if (error) throw error;

    const { data } = supabase.storage
      .from('submissions')
      .getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  return {
    assignments,
    submissions,
    loading,
    fetchAssignmentsByClass,
    fetchStudentAssignments,
    fetchSubmissionsByAssignment,
    createAssignment,
    submitAssignment,
    gradeSubmission,
    uploadFile,
  };
}
