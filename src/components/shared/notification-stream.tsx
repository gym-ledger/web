"use client";

import { useEffect } from "react";
import { startNotificationStream } from "@/lib/realtime/notificationStream";

/**
 * Renders nothing. Mounted in the signed-in layout so the notification
 * stream is open on every screen and closes on logout.
 */
export function NotificationStream() {
  useEffect(() => startNotificationStream(), []);
  return null;
}
