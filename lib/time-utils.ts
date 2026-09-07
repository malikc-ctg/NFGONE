import { TimeWindow, TIME_WINDOW_LABELS } from '@/types';

export const TIME_OPTIONS = [
  { value: '07:00', label: '7:00 AM' },
  { value: '07:30', label: '7:30 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
];

export const DURATION_OPTIONS = [
  { value: 60, label: '1 Hour' },
  { value: 90, label: '1.5 Hours' },
  { value: 120, label: '2 Hours' },
  { value: 150, label: '2.5 Hours' },
  { value: 180, label: '3 Hours' },
  { value: 210, label: '3.5 Hours' },
  { value: 240, label: '4 Hours' },
  { value: 270, label: '4.5 Hours' },
  { value: 300, label: '5 Hours' },
  { value: 330, label: '5.5 Hours' },
  { value: 360, label: '6 Hours' },
  { value: 420, label: '7 Hours' },
  { value: 480, label: '8 Hours' },
];

/**
 * Format a 24h time string (e.g. "15:00") into 12h format ("3:00 PM").
 */
export function format12Hour(time24: string): string {
  if (!time24) return '';
  if (time24.includes('AM') || time24.includes('PM')) return time24;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const m = mStr ? parseInt(mStr, 10) : 0;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const minFormatted = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${minFormatted} ${period}`;
}

/**
 * Calculate end time string (12h format e.g. "9:00 PM") given start time ("15:00") and duration in minutes (360).
 */
export function calculateEndTime(startTime24: string, durationMinutes: number): string {
  if (!startTime24) return '';
  // Normalize 12h back to 24h if passed as "3:00 PM"
  let h = 9;
  let m = 0;

  if (startTime24.includes('AM') || startTime24.includes('PM')) {
    const parts = startTime24.trim().split(/[\s:]+/);
    h = parseInt(parts[0], 10) || 9;
    m = parseInt(parts[1], 10) || 0;
    const isPM = startTime24.toUpperCase().includes('PM');
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
  } else {
    const [hStr, mStr] = startTime24.split(':');
    h = parseInt(hStr, 10) || 9;
    m = parseInt(mStr, 10) || 0;
  }

  const totalMinutes = h * 60 + m + (durationMinutes || 0);
  const endH = Math.floor((totalMinutes / 60) % 24);
  const endM = totalMinutes % 60;
  const period = endH >= 12 ? 'PM' : 'AM';
  let displayH = endH % 12;
  if (displayH === 0) displayH = 12;
  const displayM = endM < 10 ? `0${endM}` : `${endM}`;
  return `${displayH}:${displayM} ${period}`;
}

/**
 * Infer legacy TimeWindow ('morning'|'afternoon'|'evening') from start time string (e.g. "15:00")
 */
export function inferTimeWindow(startTime24: string): TimeWindow {
  let h = 9;
  if (startTime24) {
    const [hStr] = startTime24.split(':');
    h = parseInt(hStr, 10) || 9;
  }
  if (h < 12) return 'morning';
  if (h < 16) return 'afternoon';
  return 'evening';
}

/**
 * Format job time display, e.g. "3:00 PM – 9:00 PM (6 hrs)"
 * Falls back to legacy scheduled_window label if start time is missing.
 */
export function formatJobTimeSlot(job: {
  scheduled_start_time?: string | null;
  estimated_duration_minutes?: number | null;
  scheduled_window?: TimeWindow | null;
}): string {
  if (job.scheduled_start_time) {
    const startFormatted = format12Hour(job.scheduled_start_time);
    const duration = job.estimated_duration_minutes || 180;
    const endFormatted = calculateEndTime(job.scheduled_start_time, duration);
    const hours = Math.round((duration / 60) * 10) / 10;
    return `${startFormatted} – ${endFormatted} (${hours} hrs)`;
  }
  if (job.scheduled_window && TIME_WINDOW_LABELS[job.scheduled_window]) {
    return TIME_WINDOW_LABELS[job.scheduled_window];
  }
  return 'TBD';
}
