import type { ReactNode } from 'react';
import { STATUS_BADGE_COLORS } from '../../lib/utils';

interface BadgeProps {
  status: string;
  children?: ReactNode;
  className?: string;
}

export function Badge({ status, children, className = '' }: BadgeProps) {
  const color = STATUS_BADGE_COLORS[status] || STATUS_BADGE_COLORS['incomplete'];

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${color} ${className}`}>
      {children || status}
    </span>
  );
}
