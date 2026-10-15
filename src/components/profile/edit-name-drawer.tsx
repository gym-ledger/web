"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { updateName, type UserProfile } from "@/lib/api/profile";

// Mirrors NAME_MAX_LENGTH on the API.
const NAME_MAX_LENGTH = 100;

export function EditNameDrawer({
  open,
  profile,
  onClose,
  onSaved,
}: {
  open: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  // Refill the fields from the profile each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
    }
  }

  const first = firstName.trim();
  const last = lastName.trim();
  const dirty = first !== (profile.first_name ?? "") || last !== (profile.last_name ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!first || saving) return;
    setSaving(true);
    try {
      onSaved(await updateName({ firstName: first, lastName: last || null }));
      toast.success("Profile updated");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <form onSubmit={handleSave}>
          <DrawerHeader>
            <DrawerTitle>Edit profile</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-3 px-4 pb-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="first-name" className="label-caps">
                First name
              </label>
              <Input
                id="first-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={NAME_MAX_LENGTH}
                className="h-13 rounded-xl text-base"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="last-name" className="label-caps">
                Last name <span className="normal-case tracking-normal text-subtle">· optional</span>
              </label>
              <Input
                id="last-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={NAME_MAX_LENGTH}
                className="h-13 rounded-xl text-base"
              />
            </div>
          </div>

          <DrawerFooter>
            <Button type="submit" size="xl" disabled={!first || !dirty || saving}>
              {saving && <Loader2 className="animate-spin" />}
              Save changes
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
