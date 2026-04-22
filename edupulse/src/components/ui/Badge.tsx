import { cn, getStatusBadgeClass, getRoleBadgeClass } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'role' | 'status' | 'custom';
  value?: string;
  className?: string;
}

export default function Badge({ children, variant = 'custom', value, className }: BadgeProps) {
  const autoClass = variant === 'role' ? getRoleBadgeClass(value || '')
    : variant === 'status' ? getStatusBadgeClass(value || '')
    : '';

  return (
    <span className={cn('badge', autoClass, className)}>
      {children}
    </span>
  );
}
