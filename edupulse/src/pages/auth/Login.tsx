import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardPath } from '../../lib/utils';
import { GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import Button from '../../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn, role } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { resetPassword } = useAuth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await signIn(data.email, data.password);
      toast.success('Welcome back!');
      // role will be set after signIn resolves
      const store = await import('../../store/authStore');
      const currentRole = store.default.getState().role;
      navigate(getDashboardPath(currentRole || role || 'student'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }
    try {
      await resetPassword(resetEmail);
      toast.success('Password reset email sent!');
      setShowReset(false);
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-8">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-5xl font-heading font-bold mb-4">EduPulse</h1>
          <p className="text-xl text-white/80 leading-relaxed max-w-md">
            AI-powered academic monitoring platform. Track attendance, assignments, quizzes, and performance — all in one place.
          </p>
          <div className="flex gap-6 mt-12">
            <div className="text-center">
              <p className="text-3xl font-heading font-bold">AI</p>
              <p className="text-sm text-white/60 mt-1">Analytics</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-heading font-bold">4</p>
              <p className="text-sm text-white/60 mt-1">User Roles</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-heading font-bold">Real</p>
              <p className="text-sm text-white/60 mt-1">Time Sync</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-gray-900">EduPulse</h1>
          </div>

          <h2 className="text-2xl font-heading font-bold text-gray-900">Welcome back</h2>
          <p className="text-gray-500 mt-2 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className={`input-field pl-10 ${errors.email ? 'input-error' : ''}`}
                />
              </div>
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input-field pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
              Create account
            </Link>
          </p>

          {/* Password Reset Modal */}
          {showReset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowReset(false)} />
              <div className="relative bg-white rounded-2xl shadow-modal p-6 w-full max-w-sm animate-slide-up">
                <h3 className="text-lg font-heading font-semibold mb-4">Reset Password</h3>
                <p className="text-sm text-gray-500 mb-4">Enter your email to receive a reset link.</p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field mb-4"
                />
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setShowReset(false)} className="flex-1">Cancel</Button>
                  <Button onClick={handleResetPassword} className="flex-1">Send Link</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
