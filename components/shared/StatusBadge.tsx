'use client';

import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS } from '@/lib/job-state-machine';
import { JOB_STATUS_LABELS } from '@/types';
import type { JobStatus } from '@/types';

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  const label = JOB_STATUS_LABELS[status] ?? status;

  return (
    <Badge
      variant="outline"
      className={`${colors.bg} ${colors.text} border-0 font-medium text-xs ${className}`}
    >
      {label}
    </Badge>
  );
}
