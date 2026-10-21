import { apiClient, ApiError } from "@/lib/api-client";
import { API_BASE } from "@/auth/authConstants";
import { getValidAccessToken } from "@/auth/tokenManager";
import type { UserProfile } from "@/lib/api/profile";

export type DataExportStatus = "pending" | "processing" | "ready" | "failed" | "expired";

export interface DataExport {
  id: string;
  status: DataExportStatus;
  size_bytes: number | null;
  error: string | null;
  requested_at: string;
  completed_at: string | null;
  /** The file can be downloaded until then. */
  expires_at: string | null;
}

/** How the user confirms deleting the account; null = they need to set a password first. */
export type DeletionConfirmMethod = "password" | "email_code" | "phone_code" | null;

export interface AccountData {
  deletion: {
    scheduled_for: string | null;
    requested_at: string | null;
    grace_days: number;
    confirm_with: DeletionConfirmMethod;
  };
  export: {
    latest: DataExport | null;
    ttl_days: number;
  };
}

/** Deletion status and the latest data export (offline: the last copy fetched). */
export async function fetchAccountData(): Promise<AccountData> {
  return apiClient.get<AccountData>("/user/account");
}

/** Queues a new export; 409 while one is still being prepared. */
export async function requestDataExport(): Promise<DataExport> {
  return apiClient.post<DataExport>("/user/account/exports");
}

/** Downloads a ready export straight to the device as a .json file. */
export async function downloadDataExport(exportId: string): Promise<void> {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/user/account/exports/${exportId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let message = "Couldn't download your data";
    try {
      message = ((await res.json()) as { error?: { message?: string } }).error?.message ?? message;
    } catch {
      // Not JSON; keep the generic message.
    }
    throw new ApiError(res.status, message);
  }
  const fileName = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "gym-ledger-data.json";
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** For accounts without a password: sends a 6-digit code that confirms the deletion. */
export async function sendDeletionCode(): Promise<{ sent_to: "email" | "phone" }> {
  return apiClient.post<{ sent_to: "email" | "phone" }>("/user/account/deletion/send-code");
}

/**
 * Schedules the account for deletion and signs it out everywhere (this
 * device included). Confirmed with the password, or the code from
 * sendDeletionCode for accounts without one.
 */
export async function requestAccountDeletion(
  confirmation: { password: string } | { code: string },
): Promise<{ deletion_scheduled_for: string }> {
  return apiClient.post<{ deletion_scheduled_for: string }>("/user/account/deletion", confirmation);
}

/** Keeps the account: clears a scheduled deletion (after signing in during the 30 days). */
export async function cancelAccountDeletion(): Promise<{ user: UserProfile }> {
  return apiClient.post<{ user: UserProfile }>("/user/account/deletion/cancel");
}
