'use client';

import type { Job, ContractorLocation } from '@/types';
import { Briefcase, Users, Radio, AlertCircle } from 'lucide-react';

interface DashboardSummaryPanelProps {
  jobs: Job[];
  contractorCount: number;
}

export function DashboardSummaryPanel({ jobs, contractorCount }: DashboardSummaryPanelProps) {
  const activeJobs = jobs.filter(j =>
    ['on_the_way', 'in_progress'].includes(j.status)
  ).length;

  const dispatchQueue = jobs.filter(j =>
    j.status === 'confirmed' && !j.assigned_contractor_id
  ).length;

  const metrics = [
    {
      label: 'Jobs Today',
      value: jobs.length,
      icon: Briefcase,
      color: '#3B82F6',
    },
    {
      label: 'Active Now',
      value: activeJobs,
      icon: Radio,
      color: '#10B981',
    },
    {
      label: 'Contractors',
      value: contractorCount,
      icon: Users,
      color: '#8B5CF6',
    },
    {
      label: 'Dispatch Queue',
      value: dispatchQueue,
      icon: AlertCircle,
      color: dispatchQueue > 0 ? '#F59E0B' : '#6B7280',
    },
  ];

  return (
    <div
      className="sob-summary-panel"
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        border: '1px solid rgba(255,255,255,0.6)',
        minWidth: 220,
      }}
    >
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#6B7280',
          marginBottom: 12,
        }}
      >
        Today&apos;s Operations
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${metric.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <metric.icon
                style={{ width: 16, height: 16, color: metric.color }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: '#111827',
                }}
              >
                {metric.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#9CA3AF',
                  fontWeight: 500,
                }}
              >
                {metric.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
