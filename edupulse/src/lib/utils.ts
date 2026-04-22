import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculatePercentage(obtained: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((obtained / total) * 100);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'admin': return 'badge-admin';
    case 'teacher': return 'badge-teacher';
    case 'student': return 'badge-student';
    case 'parent': return 'badge-parent';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'present': return 'badge-present';
    case 'absent': return 'badge-absent';
    case 'late': return 'badge-late';
    case 'excused': return 'badge-excused';
    case 'pending': return 'badge-pending';
    case 'submitted': return 'badge-submitted';
    case 'graded': return 'badge-graded';
    case 'draft': return 'badge-draft';
    case 'active': return 'badge-active';
    case 'closed': return 'badge-closed';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getTimeRemaining(dueDate: string | Date): string {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();

  if (diff <= 0) return 'Overdue';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m remaining`;
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => {
        const val = String(row[h] ?? '');
        return val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin': return '/admin/dashboard';
    case 'teacher': return '/teacher/dashboard';
    case 'student': return '/student/dashboard';
    case 'parent': return '/parent/dashboard';
    default: return '/login';
  }
}
