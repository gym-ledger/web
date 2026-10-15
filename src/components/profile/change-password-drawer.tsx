"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/password-field";
import { ApiError } from "@/lib/api-client";
import { PASSWORD_MIN_LENGTH } from "@/lib/api/auth";
import { changePassword } from "@/lib/api/profile";

/**
 * Sets or changes the signed-in user's password. Users who have only ever
 * signed in with a code have no password yet, so they aren't asked for one.
 */
export function ChangePasswordDrawer({
  open,
  hasPassword,
  onClose,
  onSaved,
}: {
  open: boolean;
  hasPassword: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start blank each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }

  const tooShort = newPassword.length > 0 && newPassword.length < PASSWORD_MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSave =
    (!hasPassword || currentPassword.length > 0) &&
    newPassword.length >= PASSWORD_MIN_LENGTH &&
    confirmPassword === newPassword;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      await changePassword({ ...(hasPassword && { currentPassword }), newPassword });
      toast.success(hasPassword ? "Password changed" : "Password set");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <form onSubmit={handleSave} className="overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>{hasPassword ? "Change password" : "Set a password"}</DrawerTitle>
            {!hasPassword && (
              <p className="text-sm text-muted-foreground">
                Sign in with it instead of waiting for a code. Codes keep working too.
              </p>
            )}
          </DrawerHeader>

          <div className="flex flex-col gap-3 px-4 pb-2">
            {hasPassword && (
              <PasswordField
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
              />
            )}
            <PasswordField
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              hint={
                tooShort
                  ? `${PASSWORD_MIN_LENGTH - newPassword.length} more characters`
                  : `At least ${PASSWORD_MIN_LENGTH} characters`
              }
            />
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {mismatch && <p className="text-sm text-destructive">Passwords don&apos;t match</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DrawerFooter>
            <Button type="submit" size="xl" disabled={!canSave || saving}>
              {saving && <Loader2 className="animate-spin" />}
              {hasPassword ? "Change password" : "Set password"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
