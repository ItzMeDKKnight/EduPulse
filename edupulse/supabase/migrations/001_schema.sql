-- =============================================
-- EduPulse Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- ENUMS
create type user_role as enum ('admin', 'teacher', 'student', 'parent');
create type attendance_status as enum ('present', 'absent', 'late', 'excused');
create type assignment_status as enum ('pending', 'submitted', 'graded', 'late');
create type quiz_status as enum ('draft', 'active', 'closed');
create type exam_type as enum ('midterm', 'final', 'quiz', 'assignment');

-- USERS / PROFILES
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text unique not null,
  role user_role not null,
  avatar_url text,
  phone text,
  created_at timestamptz default now()
);

-- CLASSES
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  teacher_id uuid references profiles(id),
  academic_year text not null,
  created_at timestamptz default now()
);

-- CLASS ENROLLMENTS (Students <-> Classes)
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  enrolled_at timestamptz default now(),
  unique(student_id, class_id)
);

-- PARENT-STUDENT LINKS
create table parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references profiles(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  unique(parent_id, student_id)
);

-- ATTENDANCE
create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  date date not null,
  status attendance_status not null default 'present',
  marked_by uuid references profiles(id),
  note text,
  created_at timestamptz default now(),
  unique(student_id, class_id, date)
);

-- ASSIGNMENTS
create table assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  max_marks integer default 100,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ASSIGNMENT SUBMISSIONS
create table assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  file_url text,
  file_name text,
  submitted_at timestamptz,
  status assignment_status default 'pending',
  marks_obtained integer,
  feedback text,
  graded_by uuid references profiles(id),
  graded_at timestamptz,
  unique(assignment_id, student_id)
);

-- QUIZZES
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  title text not null,
  description text,
  duration_minutes integer default 30,
  status quiz_status default 'draft',
  start_time timestamptz,
  end_time timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- QUIZ QUESTIONS
create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text,
  option_d text,
  correct_option char(1) not null,
  marks integer default 1,
  order_index integer
);

-- QUIZ ATTEMPTS
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  score integer,
  total_marks integer,
  answers jsonb,
  unique(quiz_id, student_id)
);

-- MARKS / GRADES
create table marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  exam_type exam_type not null,
  subject text not null,
  marks_obtained numeric not null,
  max_marks numeric not null,
  exam_date date,
  uploaded_by uuid references profiles(id),
  remarks text,
  created_at timestamptz default now()
);

-- AI PERFORMANCE REPORTS (cached)
create table performance_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  report_text text not null,
  generated_at timestamptz default now(),
  data_snapshot jsonb
);

-- ROW LEVEL SECURITY
alter table profiles enable row level security;
alter table classes enable row level security;
alter table enrollments enable row level security;
alter table parent_student_links enable row level security;
alter table attendance enable row level security;
alter table assignments enable row level security;
alter table assignment_submissions enable row level security;
alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_attempts enable row level security;
alter table marks enable row level security;
alter table performance_reports enable row level security;

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins see all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins manage all profiles" on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Teachers see students in their classes" on profiles for select using (
  exists (
    select 1 from enrollments e
    join classes c on c.id = e.class_id
    where e.student_id = profiles.id and c.teacher_id = auth.uid()
  )
);
create policy "Anyone can insert own profile" on profiles for insert with check (auth.uid() = id);

-- CLASSES
create policy "Anyone authenticated can view classes" on classes for select using (auth.uid() is not null);
create policy "Admins manage classes" on classes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Teachers manage own classes" on classes for all using (teacher_id = auth.uid());

-- ENROLLMENTS
create policy "View enrollments" on enrollments for select using (auth.uid() is not null);
create policy "Admins manage enrollments" on enrollments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Teachers manage enrollments for their classes" on enrollments for all using (
  exists (select 1 from classes where id = enrollments.class_id and teacher_id = auth.uid())
);

-- PARENT STUDENT LINKS
create policy "Parents view own links" on parent_student_links for select using (parent_id = auth.uid());
create policy "Admins manage links" on parent_student_links for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can insert own parent link" on parent_student_links for insert with check (parent_id = auth.uid());

-- ATTENDANCE
create policy "Students view own attendance" on attendance for select using (student_id = auth.uid());
create policy "Parents view child attendance" on attendance for select using (
  exists (select 1 from parent_student_links where parent_id = auth.uid() and student_id = attendance.student_id)
);
create policy "Teachers manage attendance for their classes" on attendance for all using (
  exists (select 1 from classes where id = attendance.class_id and teacher_id = auth.uid())
);
create policy "Admins manage all attendance" on attendance for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ASSIGNMENTS
create policy "View assignments for enrolled classes" on assignments for select using (auth.uid() is not null);
create policy "Teachers manage assignments" on assignments for all using (created_by = auth.uid());
create policy "Admins manage all assignments" on assignments for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ASSIGNMENT SUBMISSIONS
create policy "Students view own submissions" on assignment_submissions for select using (student_id = auth.uid());
create policy "Students manage own submissions" on assignment_submissions for all using (student_id = auth.uid());
create policy "Teachers view submissions for their assignments" on assignment_submissions for select using (
  exists (
    select 1 from assignments a
    join classes c on c.id = a.class_id
    where a.id = assignment_submissions.assignment_id and c.teacher_id = auth.uid()
  )
);
create policy "Teachers grade submissions" on assignment_submissions for update using (
  exists (
    select 1 from assignments a
    join classes c on c.id = a.class_id
    where a.id = assignment_submissions.assignment_id and c.teacher_id = auth.uid()
  )
);
create policy "Admins manage all submissions" on assignment_submissions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Parents view child submissions" on assignment_submissions for select using (
  exists (select 1 from parent_student_links where parent_id = auth.uid() and student_id = assignment_submissions.student_id)
);

-- QUIZZES
create policy "View quizzes" on quizzes for select using (auth.uid() is not null);
create policy "Teachers manage quizzes" on quizzes for all using (created_by = auth.uid());
create policy "Admins manage all quizzes" on quizzes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- QUIZ QUESTIONS
create policy "View quiz questions" on quiz_questions for select using (auth.uid() is not null);
create policy "Teachers manage quiz questions" on quiz_questions for all using (
  exists (select 1 from quizzes where id = quiz_questions.quiz_id and created_by = auth.uid())
);
create policy "Admins manage all quiz questions" on quiz_questions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- QUIZ ATTEMPTS
create policy "Students view own attempts" on quiz_attempts for select using (student_id = auth.uid());
create policy "Students create own attempts" on quiz_attempts for insert with check (student_id = auth.uid());
create policy "Students update own attempts" on quiz_attempts for update using (student_id = auth.uid());
create policy "Teachers view attempts for their quizzes" on quiz_attempts for select using (
  exists (
    select 1 from quizzes q
    join classes c on c.id = q.class_id
    where q.id = quiz_attempts.quiz_id and c.teacher_id = auth.uid()
  )
);
create policy "Admins view all attempts" on quiz_attempts for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Parents view child attempts" on quiz_attempts for select using (
  exists (select 1 from parent_student_links where parent_id = auth.uid() and student_id = quiz_attempts.student_id)
);

-- MARKS
create policy "Students view own marks" on marks for select using (student_id = auth.uid());
create policy "Parents view child marks" on marks for select using (
  exists (select 1 from parent_student_links where parent_id = auth.uid() and student_id = marks.student_id)
);
create policy "Teachers manage marks for their classes" on marks for all using (
  exists (select 1 from classes where id = marks.class_id and teacher_id = auth.uid())
);
create policy "Admins manage all marks" on marks for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- PERFORMANCE REPORTS
create policy "Students view own reports" on performance_reports for select using (student_id = auth.uid());
create policy "Parents view child reports" on performance_reports for select using (
  exists (select 1 from parent_student_links where parent_id = auth.uid() and student_id = performance_reports.student_id)
);
create policy "Teachers manage reports" on performance_reports for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('teacher', 'admin'))
);
create policy "Admins manage all reports" on performance_reports for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
