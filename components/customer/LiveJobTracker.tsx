'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SERVICE_TYPE_LABELS } from '@/types';
import { CheckCircle2, Circle } from 'lucide-react';
import type { Job } from '@/types';

export function LiveJobTracker({ initialJob }: { initialJob: Job | null }) {
  const [job, setJob] = useState<Job | null>(initialJob);
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  useEffect(() => {
    if (!initialJob) return;

    const channel = supabase
      .channel(`public:jobs:id=eq.${initialJob.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${initialJob.id}`
      }, (payload) => {
        setJob((prev) => ({ ...prev, ...payload.new } as Job));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialJob, supabase]);

  if (!job) {
    return (
      <div className="p-5 bg-slate-50 flex items-center gap-4 text-slate-500 text-sm italic">
        No upcoming services scheduled.
      </div>
    );
  }

  const steps = [
    { id: 'quoted', label: 'Quote Received', activeStatuses: ['quoted', 'deposit_paid', 'confirmed', 'offered', 'accepted', 'assigned', 'on_the_way', 'in_progress', 'completed'] },
    { id: 'assigned', label: 'Cleaner Dispatched', activeStatuses: ['assigned', 'on_the_way', 'in_progress', 'completed'] },
    { id: 'on_the_way', label: 'Cleaner is OTW', activeStatuses: ['on_the_way', 'in_progress', 'completed'] },
    { id: 'in_progress', label: 'Service Started', activeStatuses: ['in_progress', 'completed'] },
    { id: 'completed', label: 'Completed', activeStatuses: ['completed'] }
  ];

  let currentStepIndex = -1;
  steps.forEach((step, index) => {
    if (step.activeStatuses.includes(job.status)) {
      currentStepIndex = index;
    }
  });

  if (job.status === 'cancelled') {
    return (
      <div className="bg-red-50 p-5 rounded-lg border border-red-100 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
          <Circle className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-red-900 font-bold mb-1">Booking Cancelled</h3>
        <p className="text-sm text-red-600">
          This booking has been cancelled. Please contact support if you need to reschedule or have any questions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 p-5">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-bold text-blue-600 uppercase">
            {new Date(job.scheduled_date).toLocaleString('default', { month: 'short' })}
          </span>
          <span className="text-xl font-bold text-slate-900">
            {new Date(job.scheduled_date).getDate()}
          </span>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{SERVICE_TYPE_LABELS[job.service_type as keyof typeof SERVICE_TYPE_LABELS] || job.service_type}</div>
          <div className="text-sm text-slate-500">
            Scheduled for {new Date(job.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      </div>

      <div className="space-y-4 relative">
        <div className="absolute left-[11px] top-3 bottom-4 w-0.5 bg-slate-200 z-0" />
        
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentStepIndex;
          const isCurrent = idx === currentStepIndex && job.status !== 'completed';
          
          return (
            <div key={step.id} className="relative z-10 flex items-center gap-4">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center bg-white ${isCompleted ? 'text-blue-600' : 'text-slate-300'}`}>
                {isCompleted ? <CheckCircle2 className="h-6 w-6 fill-white" /> : <Circle className="h-6 w-6" />}
              </div>
              <span className={`text-sm font-medium ${isCurrent ? 'text-blue-700 animate-pulse' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
