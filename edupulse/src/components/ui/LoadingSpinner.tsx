import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export default function LoadingSpinner({ text, size = 'md', fullPage = false }: LoadingSpinnerProps) {
  const sizeClass = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-16 h-16' : 'w-10 h-10';

  const content = (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className={cn(sizeClass, 'text-primary-500 animate-spin')} />
      {text && <p className="text-sm text-gray-500 font-medium">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-card shadow-card border border-gray-100 p-6 animate-pulse">
      <div className="skeleton h-4 w-1/3 mb-4" />
      <div className="skeleton h-8 w-1/2 mb-3" />
      <div className="skeleton h-3 w-full mb-2" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-container animate-pulse">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="skeleton h-8 w-48" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-4 w-1/5" />
          <div className="skeleton h-4 w-1/6" />
          <div className="skeleton h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}
