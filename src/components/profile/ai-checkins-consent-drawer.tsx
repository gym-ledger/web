"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { setAiCheckins, type UserProfile } from "@/lib/api/profile";
import { PRIVACY_AI_SECTION_ID } from "@/lib/privacy-policy";

// Keep in sync with the AI section of /privacy and toModelInput() in the API.
const SENT = [
  "Last week's session, set and volume counts",
  "Up to 4 PRs and stalled lifts (exercise name, weight, reps)",
  "Muscles you trained most and least, as set counts",
  "Body-weight change and weekly trend — not your actual weight",
  "Your goal type, pace and whether you're on track",
];

/**
 * The warning shown before AI check-ins can be turned on: what goes to the
 * AI provider, what never does, and a link to the policy's AI section.
 */
export function AiCheckinsConsentDrawer({
  open,
  onClose,
  onEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onEnabled: (profile: UserProfile) => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setAgreed(false);
  }

  async function handleEnable() {
    if (!agreed || saving) return;
    setSaving(true);
    try {
      onEnabled(await setAiCheckins(true, true));
      toast.success("AI check-ins turned on");
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't turn on AI check-ins");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Turn on AI check-ins?</DrawerTitle>
        </DrawerHeader>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-4 pb-2 text-[14px] leading-snug">
          <p className="text-muted-foreground">
            Once a week, last week&apos;s numbers are sent to <span className="font-semibold text-foreground">Groq</span>,
            an AI provider, which writes you a short coaching note. This is what is sent:
          </p>
          <ul className="flex flex-col">
            {SENT.map((line) => (
              <li key={line} className="border-b border-line py-2">
                {line}
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-warning-line bg-warning-surface p-3">
            <p>
              <span className="font-semibold">Never sent:</span> your name, email, phone, account id, IP address, dates,
              actual body weight or height. It still describes your training and weight trend, which is health data.
            </p>
          </div>
          <p className="text-muted-foreground">
            You can turn it off any time in Settings. The note is not medical advice.{" "}
            <Link href={`/privacy#${PRIVACY_AI_SECTION_ID}`} className="font-semibold text-primary">
              Full details in the privacy policy
            </Link>
          </p>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 pt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>I understand what is sent and agree to it.</span>
          </label>
        </div>

        <DrawerFooter>
          <Button size="xl" variant="light" className="w-full" disabled={!agreed || saving} onClick={handleEnable}>
            {saving && <Loader2 className="animate-spin" />}
            Turn on
          </Button>
          <Button size="xl" variant="outline" className="w-full" onClick={onClose}>
            Not now
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
