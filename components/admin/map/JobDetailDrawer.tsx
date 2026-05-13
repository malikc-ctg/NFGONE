'use client';

import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  MapPin, Clock, DollarSign, User, Star, Phone, ExternalLink, X,
  Send, Eye, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';

interface JobDetailDrawerProps {
  job: Job;
  onClose: () => void;
  onDispatch?: (job: Job) => void;
}

export function JobDetailDrawer({ job, onClose, onDispatch }: JobDetailDrawerProps) {
  const customer = (job as any).customer;
  const contractor = (job as any).contractor;
  
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${job.address_line1}, ${job.city} ${job.postal_code}`
  )}`;

  return (
    <div
      className="sob-job-drawer"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        maxWidth: '100vw',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
        zIndex: 20,
        overflowY: 'auto',
        animation: 'slideInRight 0.25s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          zIndex: 2,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
            {job.job_number}
          </div>
          <StatusBadge status={job.status} />
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.08)',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#6B7280',
          }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {/* Service info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
            {SERVICE_TYPE_LABELS[job.service_type]}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#6B7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 12, height: 12 }} />
              {TIME_WINDOW_LABELS[job.scheduled_window]}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <DollarSign style={{ width: 12, height: 12 }} />
              ${job.quoted_price}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            {format(new Date(job.scheduled_date), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>

        {/* Address */}
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#F9FAFB',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <MapPin style={{ width: 14, height: 14, color: '#6B7280', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                {job.address_line1}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>
                {job.city} {job.postal_code}
              </div>
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: '#3B82F6',
              fontWeight: 500,
              marginTop: 8,
              textDecoration: 'none',
            }}
          >
            <ExternalLink style={{ width: 10, height: 10 }} />
            Open in Google Maps
          </a>
        </div>

        {/* Customer */}
        {customer && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', marginBottom: 8 }}>
              Customer
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User style={{ width: 14, height: 14, color: '#6B7280' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{customer.full_name}</span>
            </div>
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#3B82F6',
                  marginTop: 4,
                  textDecoration: 'none',
                }}
              >
                <Phone style={{ width: 12, height: 12 }} />
                {customer.phone}
              </a>
            )}
          </div>
        )}

        {/* Contractor */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', marginBottom: 8 }}>
            Contractor
          </div>
          {contractor ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star style={{ width: 14, height: 14, color: '#F59E0B' }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{contractor.full_name}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{contractor.score}/5</span>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, marginLeft: 22, textTransform: 'capitalize' }}>
                {contractor.tier} tier
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>No contractor assigned</div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {job.status === 'confirmed' && !job.assigned_contractor_id && onDispatch && (
            <Button
              onClick={() => onDispatch(job)}
              className="w-full"
              style={{ height: 42 }}
            >
              <Send style={{ width: 14, height: 14, marginRight: 6 }} />
              Dispatch
            </Button>
          )}

          {job.status === 'offered' && (
            <Button variant="outline" className="w-full" style={{ height: 42 }}>
              <Eye style={{ width: 14, height: 14, marginRight: 6 }} />
              View Offers
            </Button>
          )}

          {(job.status === 'assigned' || job.status === 'on_the_way') && (
            <Button variant="outline" className="w-full" style={{ height: 42 }}>
              <RefreshCw style={{ width: 14, height: 14, marginRight: 6 }} />
              Reassign
            </Button>
          )}

          {job.status === 'disputed' && (
            <Button variant="destructive" className="w-full" style={{ height: 42 }}>
              <AlertTriangle style={{ width: 14, height: 14, marginRight: 6 }} />
              View Dispute
            </Button>
          )}

          <Link href={`/admin/jobs/${job.id}`}>
            <Button variant="ghost" className="w-full text-xs" style={{ height: 36 }}>
              Open full detail →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
