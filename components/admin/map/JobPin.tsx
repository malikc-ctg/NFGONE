'use client';

import { Marker, Popup } from 'react-map-gl/mapbox';
import { useState } from 'react';
import type { Job } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  confirmed:    '#F59E0B',   // amber  — needs dispatch
  offered:      '#8B5CF6',   // purple — offer sent, waiting
  accepted:     '#3B82F6',   // blue   — accepted, not started
  assigned:     '#3B82F6',   // blue
  on_the_way:   '#10B981',   // green  — contractor moving
  in_progress:  '#059669',   // dark green — job active
  completed:    '#6B7280',   // grey
  disputed:     '#EF4444',   // red
  cancelled:    '#9CA3AF',   // light grey
};

interface JobPinProps {
  job: Job;
  onSelect: (job: Job) => void;
}

export function JobPin({ job, onSelect }: JobPinProps) {
  const [showPopup, setShowPopup] = useState(false);
  const color = STATUS_COLORS[job.status] ?? '#6B7280';

  if (!job.latitude || !job.longitude) return null;

  return (
    <>
      <Marker
        longitude={job.longitude}
        latitude={job.latitude}
        anchor="bottom"
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          onSelect(job);
          setShowPopup(true);
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            background: color,
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          className="hover:scale-110"
        />
      </Marker>

      {showPopup && (
        <Popup
          longitude={job.longitude}
          latitude={job.latitude}
          anchor="top"
          onClose={() => setShowPopup(false)}
          closeButton={false}
          className="sob-popup"
        >
          <div className="p-2 text-xs min-w-[160px]">
            <div className="font-semibold">{job.job_number}</div>
            <div className="text-gray-500 mt-0.5">
              {job.service_type.replace(/_/g, ' ')}
            </div>
            <div className="text-gray-500">
              {job.scheduled_window.replace(/_/g, ' ')}
            </div>
            <div
              className="mt-1.5 text-blue-600 cursor-pointer font-medium hover:underline"
              onClick={() => onSelect(job)}
            >
              View details →
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
