// Sea of Blue — Web Push Notifications (Server-side)
// Uses the Web Push protocol (VAPID) to send native push notifications to PWA clients.

import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:info@seaofblue.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;          // URL to open when notification is tapped
  data?: Record<string, unknown>;
}

/**
 * Send a web push notification to a single subscription.
 * Returns true if successful, false if the subscription is expired/invalid.
 */
export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[WebPush] VAPID keys not configured, skipping push');
    return false;
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/favicon.png',
    badge: payload.badge || '/favicon.png',
    tag: payload.tag || 'sob-notification',
    data: {
      url: payload.url || '/employee',
      ...(payload.data || {}),
    },
  });

  try {
    await webpush.sendNotification(subscription, pushPayload, {
      TTL: 60 * 60, // 1 hour
      urgency: 'high',
    });
    return true;
  } catch (err: any) {
    // 410 Gone or 404 means the subscription is no longer valid
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn('[WebPush] Subscription expired/invalid:', err.statusCode);
      return false;
    }
    console.error('[WebPush] Failed to send notification:', err);
    return false;
  }
}

/**
 * Send a job assignment push notification to an employee.
 */
export async function sendJobAssignedPush(
  subscription: webpush.PushSubscription,
  jobId: string,
  address: string,
  serviceType: string,
  scheduledDate: string,
  timeWindow: string
): Promise<boolean> {
  const serviceLabel = serviceType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  
  return sendWebPush(subscription, {
    title: 'New Job Assigned 🧹',
    body: `${serviceLabel} at ${address} — ${scheduledDate} (${timeWindow})`,
    tag: `job-assigned-${jobId}`,
    url: `/employee/jobs/${jobId}`,
    data: { type: 'job_assigned', job_id: jobId },
  });
}

/**
 * Send a generic push notification to an employee.
 */
export async function sendGenericPush(
  subscription: webpush.PushSubscription,
  title: string,
  body: string,
  url?: string
): Promise<boolean> {
  return sendWebPush(subscription, {
    title,
    body,
    url: url || '/employee',
  });
}
