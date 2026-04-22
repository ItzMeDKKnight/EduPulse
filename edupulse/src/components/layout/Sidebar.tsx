import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck, FileText,
  ClipboardList, BarChart3, Brain, GraduationCap, X, Award, Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Manage Users', path: '/admin/users', icon: <Users size={20} /> },
  { label: 'Manage Classes', path: '/admin/classes', icon: <BookOpen size={20} /> },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Attendance', path: '/teacher/attendance', icon: <CalendarCheck size={20} /> },
  { label: 'Assignments', path: '/teacher/assignments', icon: <FileText size={20} /> },
  { label: 'Quiz Builder', path: '/teacher/quizzes', icon: <ClipboardList size={20} /> },
  { label: 'Grades', path: '/teacher/grades', icon: <Award size={20} /> },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'My Attendance', path: '/student/attendance', icon: <CalendarCheck size={20} /> },
  { label: 'My Assignments', path: '/student/assignments', icon: <FileText size={20} /> },
  { label: 'Take Quiz', path: '/student/quizzes', icon: <ClipboardList size={20} /> },
  { label: 'My Grades', path: '/student/grades', icon: <BarChart3 size={20} /> },
];

const parentNav: NavItem[] = [
  { label: 'Dashboard', path: '/parent/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Attendance', path: '/parent/attendance', icon: <CalendarCheck size={20} /> },
  { label: 'Assignments', path: '/parent/assignments', icon: <FileText size={20} /> },
  { label: 'Quizzes', path: '/parent/quizzes', icon: <ClipboardList size={20} /> },
  { label: 'Performance', path: '/parent/performance', icon: <Brain size={20} /> },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { role, profile } = useAuth();
  const location = useLocation();

  const navItems = role === 'admin' ? adminNav
    : role === 'teacher' ? teacherNav
    : role === 'student' ? studentNav
    : parentNav;

  const roleColor = role === 'admin' ? 'from-purple-600 to-purple-800'
    : role === 'teacher' ? 'from-primary-500 to-primary-700'
    : role === 'student' ? 'from-secondary-500 to-secondary-700'
    : 'from-warning-500 to-warning-700';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[260px] bg-white border-r border-gray-200 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className={cn('p-6 bg-gradient-to-br', roleColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-white">EduPulse</h1>
                <p className="text-xs text-white/70 capitalize">{role} Portal</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Navigation
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                location.pathname === item.path
                  ? 'bg-primary-50 text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className={cn(
                'transition-colors',
                location.pathname === item.path ? 'text-primary-500' : 'text-gray-400'
              )}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary-600">
                  {profile?.full_name?.[0] || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
            <Settings size={16} className="text-gray-400" />
          </div>
        </div>
      </aside>
    </>
  );
}
