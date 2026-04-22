import { useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import type { Attendance, AttendanceStatus, AttendanceFormRow } from '../types';

export function useAttendance() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttendanceByClass = useCallback(async (classId: string, date?: string) => {
    setLoading(true);
    let query = supabase
      .from('attendance')
      .select('*, student:profiles!student_id(id, full_name, email, avatar_url)')
      .eq('class_id', classId)
      .order('date', { ascending: false });

    if (date) {
      query = query.eq('date', date);
    }
    const { data, error } = await query;
    if (error) throw error;
    setAttendance((data || []) as unknown as Attendance[]);
    setLoading(false);
    return data;
  }, []);

  const fetchStudentAttendance = useCallback(async (studentId: string, classId?: string) => {
    setLoading(true);
    let query = supabase
      .from('attendance')
      .select('*, class:classes!class_id(id, name, subject)')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (classId) {
      query = query.eq('class_id', classId);
    }
    const { data, error } = await query;
    if (error) throw error;
    setAttendance((data || []) as unknown as Attendance[]);
    setLoading(false);
    return data;
  }, []);

  const markAttendance = useCallback(async (
    classId: string,
    date: string,
    rows: AttendanceFormRow[],
    markedBy: string
  ) => {
    setLoading(true);
    const records = rows.map((r) => ({
      student_id: r.student_id,
      class_id: classId,
      date,
      status: r.status as AttendanceStatus,
      marked_by: markedBy,
      note: r.note || null,
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'student_id,class_id,date' });

    if (error) throw error;
    setLoading(false);
  }, []);

  const getAttendanceSummary = useCallback((records: Attendance[]) => {
    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const excused = records.filter((r) => r.status === 'excused').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, late, excused, percentage };
  }, []);

  return {
    attendance,
    loading,
    fetchAttendanceByClass,
    fetchStudentAttendance,
    markAttendance,
    getAttendanceSummary,
  };
}
