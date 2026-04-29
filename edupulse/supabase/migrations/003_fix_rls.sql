-- =============================================
-- Fix RLS Policies for proper access
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop problematic circular policies on profiles
drop policy if exists "Admins see all profiles" on profiles;
drop policy if exists "Admins manage all profiles" on profiles;
drop policy if exists "Teachers see students in their classes" on profiles;

-- Recreate admin policies using auth.jwt() metadata instead of circular self-reference or auth.users subqueries
-- This checks the JWT claims directly, which is extremely fast and avoids permission issues
create policy "Admins see all profiles" on profiles for select using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

create policy "Admins manage all profiles" on profiles for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Teachers can see students enrolled in their classes
create policy "Teachers see students in their classes" on profiles for select using (
  exists (
    select 1 from enrollments e
    join classes c on c.id = e.class_id
    where e.student_id = profiles.id and c.teacher_id = auth.uid()
  )
);

-- Fix admin policies on other tables too (use JWT metadata)
-- CLASSES
drop policy if exists "Admins manage classes" on classes;
create policy "Admins manage classes" on classes for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ENROLLMENTS
drop policy if exists "Admins manage enrollments" on enrollments;
create policy "Admins manage enrollments" on enrollments for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- PARENT STUDENT LINKS
drop policy if exists "Admins manage links" on parent_student_links;
create policy "Admins manage links" on parent_student_links for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ATTENDANCE
drop policy if exists "Admins manage all attendance" on attendance;
create policy "Admins manage all attendance" on attendance for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ASSIGNMENTS
drop policy if exists "Admins manage all assignments" on assignments;
create policy "Admins manage all assignments" on assignments for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- ASSIGNMENT SUBMISSIONS
drop policy if exists "Admins manage all submissions" on assignment_submissions;
create policy "Admins manage all submissions" on assignment_submissions for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- QUIZZES
drop policy if exists "Admins manage all quizzes" on quizzes;
create policy "Admins manage all quizzes" on quizzes for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- QUIZ QUESTIONS
drop policy if exists "Admins manage all quiz questions" on quiz_questions;
create policy "Admins manage all quiz questions" on quiz_questions for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- QUIZ ATTEMPTS
drop policy if exists "Admins view all attempts" on quiz_attempts;
create policy "Admins view all attempts" on quiz_attempts for select using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- MARKS
drop policy if exists "Admins manage all marks" on marks;
create policy "Admins manage all marks" on marks for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- PERFORMANCE REPORTS
drop policy if exists "Admins manage all reports" on performance_reports;
create policy "Admins manage all reports" on performance_reports for all using (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
