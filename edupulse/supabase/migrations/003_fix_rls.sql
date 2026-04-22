-- =============================================
-- Fix RLS Policies for proper access
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop problematic circular policies on profiles
drop policy if exists "Admins see all profiles" on profiles;
drop policy if exists "Admins manage all profiles" on profiles;
drop policy if exists "Teachers see students in their classes" on profiles;

-- Recreate admin policies using auth.users metadata instead of circular self-reference
-- This checks the JWT claims directly, avoiding the circular profiles lookup
create policy "Admins see all profiles" on profiles for select using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

create policy "Admins manage all profiles" on profiles for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- Teachers can see students enrolled in their classes
create policy "Teachers see students in their classes" on profiles for select using (
  exists (
    select 1 from enrollments e
    join classes c on c.id = e.class_id
    where e.student_id = profiles.id and c.teacher_id = auth.uid()
  )
);

-- Fix admin policies on other tables too (use auth metadata instead of profiles lookup)
-- CLASSES
drop policy if exists "Admins manage classes" on classes;
create policy "Admins manage classes" on classes for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ENROLLMENTS
drop policy if exists "Admins manage enrollments" on enrollments;
create policy "Admins manage enrollments" on enrollments for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- PARENT STUDENT LINKS
drop policy if exists "Admins manage links" on parent_student_links;
create policy "Admins manage links" on parent_student_links for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ATTENDANCE
drop policy if exists "Admins manage all attendance" on attendance;
create policy "Admins manage all attendance" on attendance for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ASSIGNMENTS
drop policy if exists "Admins manage all assignments" on assignments;
create policy "Admins manage all assignments" on assignments for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- ASSIGNMENT SUBMISSIONS
drop policy if exists "Admins manage all submissions" on assignment_submissions;
create policy "Admins manage all submissions" on assignment_submissions for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- QUIZZES
drop policy if exists "Admins manage all quizzes" on quizzes;
create policy "Admins manage all quizzes" on quizzes for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- QUIZ QUESTIONS
drop policy if exists "Admins manage all quiz questions" on quiz_questions;
create policy "Admins manage all quiz questions" on quiz_questions for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- QUIZ ATTEMPTS
drop policy if exists "Admins view all attempts" on quiz_attempts;
create policy "Admins view all attempts" on quiz_attempts for select using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- MARKS
drop policy if exists "Admins manage all marks" on marks;
create policy "Admins manage all marks" on marks for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);

-- PERFORMANCE REPORTS
drop policy if exists "Admins manage all reports" on performance_reports;
create policy "Admins manage all reports" on performance_reports for all using (
  (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()) = 'admin'
);
