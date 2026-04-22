import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import supabase from '../../lib/supabase';
import { GraduationCap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import type { UserRole } from '../../types';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
  role: z.enum(['admin', 'student', 'teacher', 'parent']),
  student_email: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student' },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterForm) => {
    try {
      const userId = await signUp(data.email, data.password, data.full_name, data.role as UserRole);

      // If parent, link to student
      if (data.role === 'parent' && data.student_email) {
        const { data: student } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', data.student_email)
          .eq('role', 'student')
          .single();

        if (student) {
          await supabase.from('parent_student_links').insert({
            parent_id: userId,
            student_id: student.id,
          });
        } else {
          toast.error('Student email not found. You can link later.');
        }
      }

      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err: unknown) {
      let message = 'Registration failed. Please try again.';
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('rate') || msg.includes('429') || msg.includes('too many')) {
          message = 'Too many attempts. Please wait a few minutes and try again.';
        } else if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('duplicate')) {
          message = 'This email is already registered. Try signing in instead.';
        } else if (msg.includes('network') || msg.includes('fetch')) {
          message = 'Network error. Please check your connection and try again.';
        } else if (msg.includes('invalid') && msg.includes('email')) {
          message = 'Please enter a valid email address.';
        } else if (msg.includes('password')) {
          message = err.message;
        } else {
          message = err.message;
        }
      }
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary-500 via-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-8">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-5xl font-heading font-bold mb-4">Join EduPulse</h1>
          <p className="text-xl text-white/80 leading-relaxed max-w-md">
            Create your account and start tracking academic performance with AI-powered insights.
          </p>
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold">✓</div>
              <p className="text-white/80">Real-time attendance tracking</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold">✓</div>
              <p className="text-white/80">AI-powered performance analysis</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold">✓</div>
              <p className="text-white/80">Interactive quizzes & assignments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-gray-900">EduPulse</h1>
          </div>

          <h2 className="text-2xl font-heading font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-500 mt-2 mb-8">Fill in your details to get started</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  {...register('full_name')}
                  type="text"
                  placeholder="John Doe"
                  className={`input-field pl-10 ${errors.full_name ? 'input-error' : ''}`}
                />
              </div>
              {errors.full_name && <p className="error-text">{errors.full_name.message}</p>}
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    className={`input-field pl-10 ${errors.password ? 'input-error' : ''}`}
                  />
                </div>
                {errors.password && <p className="error-text">{errors.password.message}</p>}
              </div>
              <div>
                <label className="label">Confirm</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register('confirm_password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    className={`input-field pl-10 ${errors.confirm_password ? 'input-error' : ''}`}
                  />
                </div>
                {errors.confirm_password && <p className="error-text">{errors.confirm_password.message}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <input
                type="checkbox"
                onChange={() => setShowPassword(!showPassword)}
                className="rounded"
              />
              Show passwords
            </div>

            <div>
              <label className="label">Role</label>
              <select {...register('role')} className="input-field">
                <option value="admin">Admin</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
              </select>
            </div>

            {selectedRole === 'parent' && (
              <div className="animate-fade-in">
                <label className="label">Link Student Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register('student_email')}
                    type="email"
                    placeholder="student@example.com"
                    className="input-field pl-10"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter your child's registered email to link accounts</p>
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
