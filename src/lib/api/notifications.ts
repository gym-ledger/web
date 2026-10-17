import { apiClient } from "@/lib/api-client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  /** In-app path to open, if any. */
  link: string | null;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(): Promise<{ unread: number; notifications: AppNotification[] }> {
  return apiClient.get<{ unread: number; notifications: AppNotification[] }>("/user/notifications");
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await apiClient.get<{ unread: number }>("/user/notifications/unread-count");
  return res.unread;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post<null>(`/user/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post<null>("/user/notifications/read-all");
}
