"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { performLogout } from "@/auth/tokenManager";
import { ApiError } from "@/lib/api-client";
import {
  fetchPreferences,
  fetchProfile,
  updatePreferences,
  type HeightUnits,
  type UserPreferences,
  type UserProfile,
  type WeightUnits,
} from "@/lib/api/profile";
import { cn } from "@/lib/utils";

function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** The browser's own ID for `tz`, so aliases ("Asia/Calcutta" vs "Asia/Kolkata") collapse to one name. */
function canonicalTimezone(tz: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    return tz;
  }
}

// The API stores current IANA names, while browsers may report a legacy alias of the same zone.
function sameTimezone(a: string, b: string) {
  return a === b || canonicalTimezone(a) === canonicalTimezone(b);
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-input bg-background p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-9 min-w-12 rounded-full px-3 text-[13px] font-bold transition-colors",
            value === opt.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{label}</p>
        {sub && <p className="truncate text-[13px] text-muted-foreground">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // `null` saved preferences means the user has never saved any — the first save must send every field.
  const [saved, setSaved] = useState<UserPreferences | null>(null);
  const [draft, setDraft] = useState<UserPreferences>({
    timezone: deviceTimezone(),
    weight_units: "kg",
    height_units: "cm",
    height: 0,
  });
  const [heightInput, setHeightInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([fetchProfile(), fetchPreferences()])
      .then(([p, prefs]) => {
        if (p.status === "fulfilled") setProfile(p.value);
        if (prefs.status === "fulfilled" && prefs.value) {
          setSaved(prefs.value);
          setDraft(prefs.value);
          setHeightInput(String(prefs.value.height));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const parsedHeight = heightInput.trim() ? parseFloat(heightInput) : NaN;
  const heightValid = !Number.isNaN(parsedHeight) && parsedHeight > 0;
  const dirty =
    !saved ||
    saved.weight_units !== draft.weight_units ||
    saved.height_units !== draft.height_units ||
    !sameTimezone(saved.timezone, draft.timezone) ||
    (heightValid && saved.height !== parsedHeight);

  async function handleSave() {
    if (!heightValid) {
      toast.error("Enter your height");
      return;
    }
    setSaving(true);
    try {
      const next = await updatePreferences({ ...draft, height: parsedHeight });
      setSaved(next);
      setDraft(next);
      setHeightInput(String(next.height));
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    performLogout();
    router.replace("/login");
  }

  const phone =
    profile?.phone_number != null
      ? `${profile.phone_country_code ? `+${profile.phone_country_code.replace(/^\+/, "")} ` : ""}${profile.phone_number}`
      : null;
  const deviceTz = deviceTimezone();

  return (
    <div className="flex flex-col px-4 pb-6">
      <PageHeader title="Profile" subtitle="Account" />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-7">
          <section className="flex flex-col">
            <h2 className="label-caps border-b border-input pb-2">Signed in as</h2>
            {profile?.email && (
              <Row label="Email">
                <span className="text-sm text-muted-foreground">{profile.email}</span>
              </Row>
            )}
            {phone && (
              <Row label="Phone">
                <span className="text-sm text-muted-foreground tabular-nums">{phone}</span>
              </Row>
            )}
            {!profile?.email && !phone && (
              <p className="py-3.5 text-sm text-muted-foreground">Couldn&apos;t load your account details.</p>
            )}
          </section>

          <section className="flex flex-col">
            <h2 className="label-caps border-b border-input pb-2">Units &amp; body</h2>
            {!saved && (
              <p className="pt-3 text-[13px] text-warning">
                Set these once — they&apos;re used for your stats, volume and body-weight tracking.
              </p>
            )}
            <Row label="Weight units" sub="Used for volume and PRs">
              <Segmented<WeightUnits>
                label="Weight units"
                options={[
                  { value: "kg", label: "kg" },
                  { value: "lbs", label: "lbs" },
                ]}
                value={draft.weight_units}
                onChange={(v) => setDraft((d) => ({ ...d, weight_units: v }))}
              />
            </Row>
            <Row label="Height units">
              <Segmented<HeightUnits>
                label="Height units"
                options={[
                  { value: "cm", label: "cm" },
                  { value: "ft", label: "ft" },
                ]}
                value={draft.height_units}
                onChange={(v) => setDraft((d) => ({ ...d, height_units: v }))}
              />
            </Row>
            <Row label="Height">
              <label className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  aria-label={`Height in ${draft.height_units}`}
                  placeholder="—"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className="num h-11 w-24 rounded-xl border border-input bg-background text-center text-xl outline-none placeholder:text-subtle focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">{draft.height_units}</span>
              </label>
            </Row>
            <Row label="Timezone" sub={draft.timezone}>
              {!sameTimezone(draft.timezone, deviceTz) ? (
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, timezone: deviceTz }))}
                  className="min-h-9 rounded-full border border-input px-3 text-[13px] font-semibold text-primary"
                >
                  Use {deviceTz}
                </button>
              ) : (
                <span className="text-[13px] text-subtle">This device</span>
              )}
            </Row>
            <Button
              size="xl"
              className="mt-4 w-full"
              disabled={!dirty || saving || !heightValid}
              onClick={handleSave}
            >
              {saving && <Loader2 className="animate-spin" />}
              {saved ? "Save changes" : "Save preferences"}
            </Button>
          </section>

          <section className="flex flex-col">
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-danger-line bg-danger-surface text-sm font-bold text-destructive transition-colors hover:bg-destructive/15"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </section>
        </motion.div>
      )}
    </div>
  );
}
