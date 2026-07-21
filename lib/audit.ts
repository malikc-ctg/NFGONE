/**
 * Sea of Blue — Centralized Audit Logger
 * 
 * Logs every critical action into the audit_logs table.
 * Called from API routes after mutations succeed.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export interface AuditLogParams {
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;           // e.g., 'job.status_changed'
  entityType: string;       // e.g., 'job', 'lead', 'employee'
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  request?: NextRequest;
  metadata?: Record<string, any>;
}

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await createServiceClient();

    const ipAddress = params.request?.headers.get('x-forwarded-for')
      ?? params.request?.headers.get('x-real-ip')
      ?? null;
    const userAgent = params.request?.headers.get('user-agent') ?? null;

    await supabase.from('audit_logs').insert({
      actor_id: params.actorId,
      actor_email: params.actorEmail ?? null,
      actor_role: params.actorRole ?? null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    // Audit logging should NEVER crash the main request
    console.error('[Audit] Failed to write audit log:', err);
  }
}

/**
 * Convenience: compute a clean diff of changed fields between old and new objects.
 * Only returns fields that actually changed.
 */
export function diffValues(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  fields: string[]
): { oldValues: Record<string, any>; newValues: Record<string, any> } | null {
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};
  let hasChanges = false;

  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      oldValues[field] = oldVal ?? null;
      newValues[field] = newVal ?? null;
      hasChanges = true;
    }
  }

  return hasChanges ? { oldValues, newValues } : null;
}
