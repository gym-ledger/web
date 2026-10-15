"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Moon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { performLogout } from "@/auth/tokenManager";

function SettingRow({
  label,
  sub,
  right,
  danger,
  onClick,
}: {
  label: string;
  sub?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-secondary/50",
        danger && "hover:bg-destructive/10"
      )}
    >
      <div>
        <p className={cn("text-sm font-medium", danger ? "text-destructive" : "text-foreground")}>
          {label}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {right !== undefined ? (
        <div className="shrink-0 ml-3">{right}</div>
      ) : (
        <ChevronRight className="size-4 text-muted-foreground shrink-0 ml-3" />
      )}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-secondary"
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg bg-secondary p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1 text-xs font-semibold rounded-md transition-colors",
            value === opt
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="px-4 pt-5 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {title}
    </p>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<"kg" | "lbs">("kg");
  const [restTimer, setRestTimer] = useState("120s");
  const [notifications, setNotifications] = useState(true);
  const [startDay, setStartDay] = useState("Mon");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Link href="/old/profile">
          <button className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-foreground/10 hover:bg-secondary transition-colors">
            <ArrowLeft className="size-4 text-foreground" />
          </button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {/* Training */}
        <SectionHeader title="Training" />
        <div className="rounded-2xl bg-card mx-4 ring-1 ring-foreground/10 overflow-hidden divide-y divide-border">
          <SettingRow
            label="Weight units"
            sub="Displayed throughout the app"
            right={
              <SegmentedControl
                options={["kg", "lbs"]}
                value={units}
                onChange={(v) => setUnits(v as "kg" | "lbs")}
              />
            }
          />
          <SettingRow
            label="Default rest timer"
            sub="Applied when completing a set"
            right={
              <SegmentedControl
                options={["60s", "90s", "120s", "180s"]}
                value={restTimer}
                onChange={setRestTimer}
              />
            }
          />
          <SettingRow
            label="Week starts on"
            right={
              <SegmentedControl
                options={["Mon", "Sun"]}
                value={startDay}
                onChange={setStartDay}
              />
            }
          />
        </div>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <div className="rounded-2xl bg-card mx-4 ring-1 ring-foreground/10 overflow-hidden divide-y divide-border">
          <SettingRow
            label="Push notifications"
            sub="Reminders, PRs, streak alerts"
            right={
              <Toggle
                checked={notifications}
                onChange={setNotifications}
              />
            }
          />
          <SettingRow
            label="Workout reminders"
            sub="Daily training reminder at 7:00 AM"
          />
          <SettingRow
            label="PR celebrations"
            sub="Notify me when I hit a new record"
            right={
              <Toggle
                checked={true}
                onChange={() => {}}
              />
            }
          />
        </div>

        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <div className="rounded-2xl bg-card mx-4 ring-1 ring-foreground/10 overflow-hidden">
          <SettingRow
            label="Theme"
            sub="Always dark — optimized for training"
            right={
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Moon className="size-3.5" />
                Dark
              </div>
            }
          />
        </div>

        {/* Account */}
        <SectionHeader title="Account" />
        <div className="rounded-2xl bg-card mx-4 ring-1 ring-foreground/10 overflow-hidden divide-y divide-border">
          <SettingRow label="Email address" sub="alex.chen@example.com" />
          <SettingRow label="Change password" />
          <SettingRow label="Export data" sub="Download all your workout history" />
          <SettingRow label="Connected apps" />
        </div>

        {/* Danger zone */}
        <SectionHeader title="Danger zone" />
        <div className="rounded-2xl bg-card mx-4 mb-6 ring-1 ring-foreground/10 overflow-hidden divide-y divide-border">
          <SettingRow
            label="Log out"
            danger
            onClick={() => {
              performLogout();
              router.push("/old/login");
            }}
          />
          <SettingRow
            label="Delete account"
            sub="This action cannot be undone"
            danger
          />
        </div>
      </motion.div>
    </div>
  );
}
