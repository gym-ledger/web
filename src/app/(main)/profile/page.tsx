"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Loader2, LogOut, Pencil, Settings, User } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EditNameDrawer } from "@/components/profile/edit-name-drawer";
import { InstallAppCard } from "@/components/profile/install-app-card";
import { performLogout } from "@/auth/tokenManager";
import { fetchPreferences, fetchProfile, type UserProfile } from "@/lib/api/profile";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";

function fullName(p: UserProfile) {
  return [p.first_name, p.last_name].filter(Boolean).join(" ");
}

function initials(p: UserProfile) {
  return [p.first_name, p.last_name]
    .filter(Boolean)
    .map((n) => n!.trim()[0]?.toUpperCase())
    .join("");
}

function formatPhone(p: UserProfile) {
  if (p.phone_number == null) return null;
  const code = p.phone_country_code ? `+${p.phone_country_code.replace(/^\+/, "")} ` : "";
  return `${code}${p.phone_number}`;
}

function memberSince(createdAt: string) {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ProfilePage() {
  const router = useRouter();
  const profileQuery = useCachedQuery<UserProfile>("profile", fetchProfile);
  const profile = profileQuery.data ?? null;
  const loading = profileQuery.loading;
  // Only "has the user set preferences" matters here, so only that is saved.
  const prefsMissing =
    useCachedQuery<boolean>("profile/prefs-missing", () => fetchPreferences().then((prefs) => prefs === null)).data ??
    false;
  const [editing, setEditing] = useState(false);

  function handleLogout() {
    performLogout();
    router.replace("/login");
  }

  const name = profile ? fullName(profile) : "";
  const phone = profile ? formatPhone(profile) : null;
  const since = profile ? memberSince(profile.created_at) : null;

  return (
    <div className="flex flex-col px-4 pb-6">
      <PageHeader
        title="Profile"
        subtitle="Account"
        action={
          <Link
            href="/profile/settings"
            aria-label="Settings"
            className="flex size-11 items-center justify-center rounded-full border border-input bg-card text-foreground transition-colors hover:bg-secondary"
          >
            <Settings className="size-5" />
          </Link>
        }
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
          {profile ? (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted">
                  {name ? (
                    <span className="font-display text-[26px] leading-none font-bold">{initials(profile)}</span>
                  ) : (
                    <User className="size-7 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {name ? (
                    <h2 className="truncate font-display text-[26px] leading-tight font-bold">{name}</h2>
                  ) : (
                    <h2 className="font-display text-[26px] leading-tight font-bold text-muted-foreground">
                      Add your name
                    </h2>
                  )}
                  {since && <p className="text-[13px] text-muted-foreground">Member since {since}</p>}
                </div>
              </div>

              <dl className="mt-4 flex flex-col">
                {profile.email && (
                  <div className="flex items-center justify-between gap-3 border-t border-line py-3">
                    <dt className="label-caps">Email</dt>
                    <dd className="min-w-0 truncate text-sm">{profile.email}</dd>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center justify-between gap-3 border-t border-line py-3">
                    <dt className="label-caps">Phone</dt>
                    <dd className="text-sm tabular-nums">{phone}</dd>
                  </div>
                )}
              </dl>

              <Button variant="outline" className="mt-1 h-11 w-full rounded-xl text-sm font-semibold" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
                Edit profile
              </Button>
            </section>
          ) : (
            <p className="py-3.5 text-sm text-muted-foreground">Couldn&apos;t load your account details.</p>
          )}

          {prefsMissing && (
            <Link
              href="/profile/settings"
              className="flex items-center justify-between gap-3 rounded-xl border border-warning-line bg-warning-surface px-4 py-3.5"
            >
              <div>
                <p className="text-[15px] font-semibold text-warning">Set your units &amp; height</p>
                <p className="text-[13px] text-muted-foreground">Used for your stats, volume and body-weight tracking.</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-warning" />
            </Link>
          )}

          <InstallAppCard />

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-danger-line bg-danger-surface text-sm font-bold text-destructive transition-colors hover:bg-destructive/15"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </motion.div>
      )}

      {profile && (
        <EditNameDrawer open={editing} profile={profile} onClose={() => setEditing(false)} onSaved={profileQuery.mutate} />
      )}
    </div>
  );
}
