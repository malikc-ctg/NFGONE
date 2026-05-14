import type { JobStatus } from '@/types';

export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  lead_received: ['quoted', 'confirmed', 'cancelled'],
  quoted: ['deposit_paid', 'confirmed', 'cancelled'],
  deposit_paid: ['confirmed', 'cancelled'],
  confirmed: ['offered', 'assigned', 'rescheduled', 'cancelled'],
  offered: ['accepted', 'assigned', 'confirmed', 'cancelled'],
  accepted: ['assigned', 'confirmed', 'cancelled'],
  assigned: ['on_the_way', 'no_show', 'rescheduled', 'confirmed', 'cancelled'],
  on_the_way: ['in_progress', 'assigned', 'cancelled'],
  in_progress: ['completed', 'disputed', 'cancelled'],
  completed: ['reviewed', 'disputed', 'paid_out'],
  reviewed: ['paid_out', 'completed'],
  disputed: ['refunded', 'completed', 'paid_out', 'cancelled'],
  paid_out: [],
  cancelled: ['confirmed'], // Allow undoing a cancellation if mistake
  rescheduled: ['offered', 'confirmed', 'cancelled'],
  no_show: ['rescheduled', 'confirmed', 'cancelled'],
  refunded: [],
};


export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidNextStatuses(current: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

export const STATUS_COLORS: Record<JobStatus, { bg: string; text: string }> = {
  lead_received:  { bg: 'bg-slate-100',   text: 'text-slate-700' },
  quoted:         { bg: 'bg-blue-100',     text: 'text-blue-700' },
  deposit_paid:   { bg: 'bg-emerald-100',  text: 'text-emerald-700' },
  confirmed:      { bg: 'bg-green-100',    text: 'text-green-700' },
  offered:        { bg: 'bg-amber-100',    text: 'text-amber-700' },
  accepted:       { bg: 'bg-cyan-100',     text: 'text-cyan-700' },
  assigned:       { bg: 'bg-indigo-100',   text: 'text-indigo-700' },
  on_the_way:     { bg: 'bg-violet-100',   text: 'text-violet-700' },
  in_progress:    { bg: 'bg-purple-100',   text: 'text-purple-700' },
  completed:      { bg: 'bg-teal-100',     text: 'text-teal-700' },
  reviewed:       { bg: 'bg-sky-100',      text: 'text-sky-700' },
  paid_out:       { bg: 'bg-green-100',    text: 'text-green-800' },
  cancelled:      { bg: 'bg-red-100',      text: 'text-red-700' },
  rescheduled:    { bg: 'bg-orange-100',   text: 'text-orange-700' },
  no_show:        { bg: 'bg-rose-100',     text: 'text-rose-700' },
  disputed:       { bg: 'bg-red-100',      text: 'text-red-800' },
  refunded:       { bg: 'bg-gray-100',     text: 'text-gray-700' },
};
