import webpush from "web-push";
import { config } from "./config";
import { connectToDatabase } from "./db/mongoose";
import { PushSubscription } from "./models/PushSubscription";

/** Server-only Web Push helper. Must NOT be imported from client components. */

function isVapidConfigured(): boolean {
  return Boolean(config.push.publicKey && config.push.privateKey);
}

function getWebPush(): typeof webpush {
  if (!isVapidConfigured()) {
    throw new Error(
      "VAPID keys are not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT in your environment."
    );
  }
  webpush.setVapidDetails(
    config.push.subject,
    config.push.publicKey,
    config.push.privateKey
  );
  return webpush;
}

export function getVapidPublicKey(): string | null {
  return config.push.publicKey || null;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification to every subscription belonging to a user.
 *
 * Stale/expired subscriptions (404/410 from the push service) are removed so
 * we never keep sending into the void. Returns the number of successful sends.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number }> {
  if (!isVapidConfigured()) return { sent: 0 };

  await connectToDatabase();
  const subs = await PushSubscription.find({ userId }).lean();

  let sent = 0;
  for (const sub of subs) {
    try {
      await getWebPush().sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: (sub.keys as { p256dh?: string })?.p256dh || "",
            auth: (sub.keys as { auth?: string })?.auth || "",
          },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 }
      );
      sent += 1;
    } catch (err) {
      // 404/410 means the subscription is gone — clean it up.
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
      } else {
        console.error("[push] Failed to send notification:", err);
      }
    }
  }
  return { sent };
}
