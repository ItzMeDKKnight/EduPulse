import { createBrowserRouter, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import RoleGuard from '../components/shared/RoleGuard';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManageUsers from '../pages/admin/ManageUsers';
import ManageClasses from '../pages/admin/ManageClasses';

// Teacher Pages
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import AttendanceManager from '../pages/teacher/AttendanceManager';
import AssignmentManager from '../pages/teacher/AssignmentManager';
import QuizBuilder from '../pages/teacher/QuizBuilder';
import GradeManager from '../pages/teacher/GradeManager';

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard';
import MyAttendance from '../pages/student/MyAttendance';
import MyAssignments from '../pages/student/MyAssignments';
import TakeQuiz from '../pages/student/TakeQuiz';
import MyGrades from '../pages/student/MyGrades';

// Parent Pages
import ParentDashboard from '../pages/parent/ParentDashboard';
import ChildAttendance from '../pages/parent/ChildAttendance';
import ChildAssignments from '../pages/parent/ChildAssignments';
import ChildQuizzes from '../pages/parent/ChildQuizzes';
import ChildPerformance from '../pages/parent/ChildPerformance';

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <h1 className="text-6xl font-heading font-bold text-gray-200">404</h1>
        <p className="text-lg text-gray-500 mt-2">Page not found</p>
        <a href="/login" className="btn-primary inline-block mt-6">Go to Login</a>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },

  // Admin routes
  {
    path: '/admin',
    element: (
      <RoleGuard allowedRoles={['admin']}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'users', element: <ManageUsers /> },
      { path: 'classes', element: <ManageClasses /> },
      { index: true, element: <Navigate to="dashboard" replace /> },
    ],
  },

  // Teacher routes
  {
    path: '/teacher',
    element: (
      <RoleGuard allowedRoles={['teacher']}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: 'dashboard', element: <TeacherDashboard /> },
      { path: 'attendance', element: <AttendanceManager /> },
      { path: 'assignments', element: <AssignmentManager /> },
      { path: 'quizzes', element: <QuizBuilder /> },
      { path: 'grades', element: <GradeManager /> },
      { index: true, element: <Navigate to="dashboard" replace /> },
    ],
  },

  // Student routes
  {
    path: '/student',
    element: (
      <RoleGuard allowedRoles={['student']}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: 'dashboard', element: <StudentDashboard /> },
      { path: 'attendance', element: <MyAttendance /> },
      { path: 'assignments', element: <MyAssignments /> },
      { path: 'quizzes', element: <TakeQuiz /> },
      { path: 'grades', element: <MyGrades /> },
      { index: true, element: <Navigate to="dashboard" replace /> },
    ],
  },

  // Parent routes
  {
    path: '/parent',
    element: (
      <RoleGuard allowedRoles={['parent']}>
        <DashboardLayout />
      </RoleGuard>
    ),
    children: [
      { path: 'dashboard', element: <ParentDashboard /> },
      { path: 'attendance', element: <ChildAttendance /> },
      { path: 'assignments', element: <ChildAssignments /> },
      { path: 'quizzes', element: <ChildQuizzes /> },
      { path: 'performance', element: <ChildPerformance /> },
      { index: true, element: <Navigate to="dashboard" replace /> },
    ],
  },

  // Redirects
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFound /> },
]);

export default router;
