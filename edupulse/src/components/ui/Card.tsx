import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-card shadow-card border border-gray-100 animate-fade-in',
      hover && 'hover:shadow-card-hover transition-all duration-300',
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-card', className)}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
}

export function StatCard({ label, value, icon, color, change }: StatCardProps) {
  return (
    <div className="stat-card animate-slide-up group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-heading font-bold mt-1 text-gray-900">{value}</p>
          {change && (
            <p className={cn(
              'text-xs font-medium mt-2',
              change.startsWith('+') ? 'text-secondary-500' : 'text-danger-500'
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
          color
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
