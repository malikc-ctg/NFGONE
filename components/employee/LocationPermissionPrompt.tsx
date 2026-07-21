'use client';

import { useEffect, useState } from 'react';

export function LocationPermissionPrompt() {
  const [status, setStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' as PermissionName })
      .then(result => {
        setStatus(result.state as any);
        result.addEventListener('change', () => setStatus(result.state as any));
      })
      .catch(() => setStatus('prompt'));
  }, []);

  if (status === 'granted' || status === 'unknown') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 64,
        left: 0,
        right: 0,
        maxWidth: 512,
        margin: '0 auto',
        background: 'white',
        borderTop: '1px solid #E5E7EB',
        padding: '16px 20px',
        zIndex: 50,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
        borderRadius: '16px 16px 0 0',
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
        Enable location sharing
      </p>
      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.4 }}>
        Sea of Blue uses your location to show customers you are on your way.
        Location is only shared during active jobs.
      </p>
      {status === 'denied' ? (
        <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8, fontWeight: 500 }}>
          Location access was denied. Please enable it in your browser settings.
        </p>
      ) : (
        <button
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              () => setStatus('granted'),
              () => setStatus('denied')
            );
          }}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '12px',
            borderRadius: 10,
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Enable location
        </button>
      )}
    </div>
  );
}
