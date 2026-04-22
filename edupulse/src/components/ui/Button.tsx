import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClass = variant === 'primary' ? 'btn-primary'
    : variant === 'secondary' ? 'btn-secondary'
    : variant === 'danger' ? 'btn-danger'
    : variant === 'ghost' ? 'btn-ghost'
    : 'btn-outline';

  const sizeClass = size === 'sm' ? 'text-xs px-3 py-1.5'
    : size === 'lg' ? 'text-base px-6 py-3'
    : 'text-sm';

  return (
    <button
      className={cn(baseClass, sizeClass, 'inline-flex items-center justify-center gap-2', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
