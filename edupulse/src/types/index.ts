// =============================================
// EduPulse TypeScript Types & Interfaces
// =============================================

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'late';
export type QuizStatus = 'draft' | 'active' | 'closed';
export type ExamType = 'midterm' | 'final' | 'quiz' | 'assignment';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  subject: string;
  teacher_id: string;
  academic_year: string;
  created_at: string;
  teacher?: Profile;
  student_count?: number;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  enrolled_at: string;
  student?: Profile;
  class?: Class;
}

export interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
  student?: Profile;
  parent?: Profile;
}

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by: string | null;
  note: string | null;
  created_at: string;
  student?: Profile;
  class?: Class;
}

export interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string;
  max_marks: number;
  created_by: string;
  created_at: string;
  class?: Class;
  submissions_count?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string | null;
  status: AssignmentStatus;
  marks_obtained: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  student?: Profile;
  assignment?: Assignment;
}

export interface Quiz {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  status: QuizStatus;
  start_time: string | null;
  end_time: string | null;
  created_by: string;
  created_at: string;
  class?: Class;
  questions_count?: number;
  attempts_count?: number;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_option: string;
  marks: number;
  order_index: number | null;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  answers: Record<string, string> | null;
  student?: Profile;
  quiz?: Quiz;
}

export interface Mark {
  id: string;
  student_id: string;
  class_id: string;
  exam_type: ExamType;
  subject: string;
  marks_obtained: number;
  max_marks: number;
  exam_date: string | null;
  uploaded_by: string | null;
  remarks: string | null;
  created_at: string;
  student?: Profile;
  class?: Class;
}

export interface PerformanceReport {
  id: string;
  student_id: string;
  report_text: string;
  generated_at: string;
  data_snapshot: unknown;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: 'student' | 'teacher' | 'parent';
  student_email?: string;
}

export interface AttendanceFormRow {
  student_id: string;
  student_name: string;
  status: AttendanceStatus;
  note: string;
}

export interface CreateAssignmentForm {
  class_id: string;
  title: string;
  description: string;
  due_date: string;
  max_marks: number;
}

export interface CreateQuizForm {
  class_id: string;
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
}

export interface CreateQuestionForm {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  marks: number;
}

export interface UploadMarksForm {
  student_id: string;
  class_id: string;
  exam_type: ExamType;
  subject: string;
  marks_obtained: number;
  max_marks: number;
  exam_date: string;
  remarks: string;
}

export interface CreateClassForm {
  name: string;
  subject: string;
  teacher_id: string;
  academic_year: string;
}

// Chart data types
export interface SubjectPerformance {
  subject: string;
  percentage: number;
  fullMark: number;
}

export interface AttendanceChartData {
  month: string;
  present: number;
  absent: number;
  late: number;
}

export interface MarksChartData {
  date: string;
  subject: string;
  percentage: number;
}

// Dashboard stat types
export interface DashboardStat {
  label: string;
  value: string | number;
  change?: string;
  icon: string;
  color: string;
}
