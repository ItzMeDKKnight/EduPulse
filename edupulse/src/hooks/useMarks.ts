import { useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import type { Mark } from '../types';
import { generatePerformanceReport, type StudentPerformanceData } from '../lib/claude';

export function useMarks() {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMarksByStudent = useCallback(async (studentId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marks')
      .select('*, class:classes!class_id(id, name, subject)')
      .eq('student_id', studentId)
      .order('exam_date', { ascending: false });
    if (error) throw error;
    setMarks((data || []) as unknown as Mark[]);
    setLoading(false);
    return data;
  }, []);

  const fetchMarksByClass = useCallback(async (classId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marks')
      .select('*, student:profiles!student_id(id, full_name, email)')
      .eq('class_id', classId)
      .order('exam_date', { ascending: false });
    if (error) throw error;
    setMarks((data || []) as unknown as Mark[]);
    setLoading(false);
    return data;
  }, []);

  const uploadMark = useCallback(async (markData: {
    student_id: string;
    class_id: string;
    exam_type: string;
    subject: string;
    marks_obtained: number;
    max_marks: number;
    exam_date: string;
    uploaded_by: string;
    remarks?: string;
  }) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marks')
      .insert(markData)
      .select()
      .single();
    if (error) throw error;
    setLoading(false);
    return data;
  }, []);

  const bulkUploadMarks = useCallback(async (marksData: Array<{
    student_id: string;
    class_id: string;
    exam_type: string;
    subject: string;
    marks_obtained: number;
    max_marks: number;
    exam_date: string;
    uploaded_by: string;
    remarks?: string;
  }>) => {
    setLoading(true);
    const { error } = await supabase
      .from('marks')
      .insert(marksData);
    if (error) throw error;
    setLoading(false);
  }, []);

  const generateReport = useCallback(async (studentId: string, studentName: string) => {
    setLoading(true);
    try {
      // Fetch all data for the student
      const { data: marksData } = await supabase
        .from('marks')
        .select('*')
        .eq('student_id', studentId);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId);

      const { data: submissionsData } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId);

      const { data: attemptsData } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('student_id', studentId);

      const attendance = attendanceData || [];
      const submissions = submissionsData || [];
      const attemptsArr = attemptsData || [];
      const gradedSubs = submissions.filter((s) => s.status === 'graded' && s.marks_obtained != null);

      const studentPerf: StudentPerformanceData = {
        name: studentName,
        attendance: {
          present: attendance.filter((a) => a.status === 'present').length,
          absent: attendance.filter((a) => a.status === 'absent').length,
          late: attendance.filter((a) => a.status === 'late').length,
          total: attendance.length,
        },
        marks: (marksData || []).map((m) => ({
          subject: m.subject,
          exam_type: m.exam_type,
          marks_obtained: Number(m.marks_obtained),
          max_marks: Number(m.max_marks),
          date: m.exam_date || m.created_at,
        })),
        assignments: {
          total: submissions.length,
          submitted: submissions.filter((s) => s.status !== 'pending').length,
          graded: gradedSubs.length,
          avg_marks: gradedSubs.length > 0
            ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.marks_obtained || 0), 0) / gradedSubs.length)
            : 0,
        },
        quizzes: {
          total: attemptsArr.length,
          attempted: attemptsArr.filter((a) => a.submitted_at).length,
          avg_score_percent: attemptsArr.filter((a) => a.submitted_at && a.total_marks).length > 0
            ? Math.round(
                attemptsArr
                  .filter((a) => a.submitted_at && a.total_marks)
                  .reduce((sum, a) => sum + ((a.score || 0) / (a.total_marks || 1)) * 100, 0) /
                attemptsArr.filter((a) => a.submitted_at && a.total_marks).length
              )
            : 0,
        },
      };

      const reportText = await generatePerformanceReport(studentPerf);

      // Save to performance_reports table
      await supabase.from('performance_reports').insert({
        student_id: studentId,
        report_text: reportText,
        data_snapshot: studentPerf,
      });

      setLoading(false);
      return reportText;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const fetchLatestReport = useCallback(async (studentId: string) => {
    const { data, error } = await supabase
      .from('performance_reports')
      .select('*')
      .eq('student_id', studentId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }, []);

  return {
    marks,
    loading,
    fetchMarksByStudent,
    fetchMarksByClass,
    uploadMark,
    bulkUploadMarks,
    generateReport,
    fetchLatestReport,
  };
}
