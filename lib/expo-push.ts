// Sea of Blue — Expo Push Notifications (Server SDK)
// Wraps the Expo server SDK for sending push notifications to the native employee app.

import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export async function sendPushToEmployee(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.warn('Invalid or missing Expo push token, skipping push notification');
    return;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data ?? {},
    priority: data?.type === 'job_offer' ? 'high' : 'normal',
    ttl: data?.type === 'job_offer' ? 1800 : 3600, // job offers expire in 30 min
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error('Expo push error:', ticket.message, ticket.details);
        }
      }
    }
  } catch (err) {
    console.error('Failed to send Expo push notification:', err);
  }
}

export async function sendJobOfferPush(
  pushToken: string,
  jobId: string,
  serviceType: string,
  city: string,
  window: string,
  payout: number
): Promise<void> {
  const serviceLabel = serviceType.replace(/_/g, ' ');
  const windowLabel = window.charAt(0).toUpperCase() + window.slice(1);

  await sendPushToEmployee(
    pushToken,
    'New job offer 🧹',
    `${serviceLabel} in ${city} — ${windowLabel}. Payout: $${payout.toFixed(2)}`,
    { type: 'job_offer', job_id: jobId }
  );
}

export async function sendJobReminderPush(
  pushToken: string,
  jobId: string,
  address: string,
  window: string
): Promise<void> {
  await sendPushToEmployee(
    pushToken,
    'Job reminder',
    `Tomorrow: ${address} — ${window}`,
    { type: 'job_reminder', job_id: jobId }
  );
}
