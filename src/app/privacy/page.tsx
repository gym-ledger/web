import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  BACKUP_RETENTION_DAYS,
  DATA_EXPORT_TTL_DAYS,
  OPERATOR_NAME,
  PRIVACY_AI_SECTION_ID,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_DELETION_SECTION_ID,
  PRIVACY_POLICY_UPDATED,
  REQUEST_LOG_RETENTION_DAYS,
} from "@/lib/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What this app stores about you, who it is shared with, and your choices.",
};

// Public: readable before signing in, and linked from sign-up and the AI
// consent sheet. Keep every statement here true to the code — in particular
// the AI section must match toModelInput() in the API's check-in service.

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-2.5 border-t border-line pt-5">
      <h2 className="font-display text-[22px] leading-tight font-bold">{title}</h2>
      <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-muted-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicyPage() {
  const contact = PRIVACY_CONTACT_EMAIL ? (
    <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="font-semibold text-primary">
      {PRIVACY_CONTACT_EMAIL}
    </a>
  ) : (
    <>the contact address of whoever runs this instance</>
  );

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-12">
      <Link
        href="/"
        aria-label="Back to the app"
        className="flex size-11 items-center justify-center rounded-full border border-input bg-card text-foreground transition-colors hover:bg-secondary"
      >
        <ArrowLeft className="size-5" />
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-none font-bold">Privacy policy</h1>
        <p className="text-[13px] text-muted-foreground">Last updated {PRIVACY_POLICY_UPDATED}</p>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          This app is free, open-source software. Anyone can run their own copy, so the person or group
          responsible for your data is whoever runs the copy you signed up to: here, <strong className="text-foreground">{OPERATOR_NAME}</strong>.
          There are no ads, no tracking or analytics scripts, and your data is never sold. Using the app also means
          agreeing to the{" "}
          <Link href="/terms" className="font-semibold text-primary">
            terms of use
          </Link>
          .
        </p>
      </header>

      <Section title="What is stored">
        <List
          items={[
            <><strong>Account:</strong> your email address or phone number, your first and last name if you add them, and your password if you set one (stored only as a one-way hash).</>,
            <><strong>Sign-in:</strong> one-time sign-in codes (hashed and short-lived) and your active sessions (a hashed token, when it was created and last used). Your IP address isn&apos;t saved to your account, though the server&apos;s request logs record IP addresses for security and troubleshooting.</>,
            <><strong>Training:</strong> your plans, workouts and every set you log (weight, reps, effort, warm-up and drop sets, and any discomfort notes you write), plus the muscle-training numbers the app works out from them.</>,
            <><strong>Body:</strong> body-weight entries, height, units, time zone, body-weight goals and their history, and your onboarding answers (training goal, experience, days per week, equipment).</>,
            <><strong>AI check-ins</strong>, only if you turn them on: each week&apos;s summary numbers and the note written from them (see below).</>,
            <><strong>Errors and slow responses:</strong> when a request from your app to the server fails or takes longer than half a second, a record of it: when it happened, which action and address it was (the address can include the id of a workout, set or plan, never what you typed), the result code, how long it took, the error, and your account id. Nothing you sent, no IP address.</>,
            <><strong>Data exports</strong> you ask for: a copy of all of the above, kept for {DATA_EXPORT_TTL_DAYS} days so you can download it.</>,
          ]}
        />
      </Section>

      <Section title="Why it is stored">
        <p>
          Only to run the app for you: signing you in, saving your workouts and weight, and showing your
          progress, records and suggestions, and to keep it working: the error and slow-response records are
          there to find and fix problems. Nothing is used for advertising or profiling.
        </p>
      </Section>

      <Section title="On your device">
        <p>
          The app keeps a sign-in cookie that page scripts can&apos;t read, and saves a copy of your recent data and
          any workouts logged offline in your browser&apos;s storage so it works in the gym without signal. Signing
          out clears that copy.
        </p>
        <p>
          Before a sign-in code is sent, your browser quietly solves a small puzzle that makes automated abuse
          expensive. It is checked by this app&apos;s own server, involves no outside service, and collects nothing
          about you.
        </p>
      </Section>

      <Section title="Services that receive data">
        <List
          items={[
            <><strong>Resend</strong> delivers sign-in codes by email: it receives your email address and the code.</>,
            <><strong>Twilio</strong> delivers sign-in codes by WhatsApp, if phone sign-in is enabled: it receives your phone number and the code.</>,
            <><strong>Groq</strong> writes the AI check-in, only if you turn it on, and receives no contact details (next section).</>,
          ]}
        />
        <p>Nothing else leaves the server. Fonts and icons are served by this app itself.</p>
      </Section>

      <Section id={PRIVACY_AI_SECTION_ID} title="AI weekly check-ins (optional)">
        <p>
          <strong>Off unless you turn it on.</strong> When it is on, once a week the server computes last week&apos;s
          numbers and sends them to <strong>Groq</strong>, an AI provider, which writes a short coaching note. You can
          turn it off at any time in Settings, and nothing more is sent.
        </p>
        <p>
          <strong>Exactly what is sent</strong>, as plain numbers and labels:
        </p>
        <List
          items={[
            <>Your weight unit (kg or lb).</>,
            <>Training: sessions and training days done, how many were planned, average session length, working sets, how many sets you marked with discomfort, and total volume this week, last week and usually.</>,
            <>Up to 4 personal records (exercise name, weight, reps, estimated one-rep max and the previous best) and up to 4 stalled lifts (exercise name, best estimated one-rep max, sessions in the last 3 weeks).</>,
            <>Up to 4 most-trained muscles and up to 4 muscles trained less than usual, with set counts.</>,
            <>Body weight as <strong>changes only</strong>: how many times and on how many days you weighed in, the change from last week and the weekly trend. Your actual body weight is not sent.</>,
            <>Your goal type (lose, maintain or gain), the pace you chose, weeks left, the weekly pace needed, the matching calorie guideline and whether you are on pace. Your target weight and goal date are not sent.</>,
          ]}
        />
        <p>
          <strong>Never sent:</strong> your name, email, phone number, account id, password, IP address, dates,
          actual body weight, height, notes you typed, or any other part of your history. The request comes from this
          app&apos;s server, not your phone, so Groq can&apos;t see your device or connection. Nothing in it says who you
          are, but it does describe your training and body-weight trend, so only turn it on if you&apos;re comfortable
          with that.
        </p>
        <p>
          Groq says it does not keep request content by default, except reliability and abuse logs for up to 30
          days, stored in the United States (
          <a href="https://console.groq.com/docs/your-data" className="font-semibold text-primary" rel="noreferrer" target="_blank">
            Groq&apos;s data policy
          </a>
          ). The note is written by AI from your numbers and is not medical advice.
        </p>
        <p>
          The server also records that a request was made (when, which model, how long it took and how many tokens it
          used, but never its content) for one year, to keep usage within limits.
        </p>
      </Section>

      <Section title="Who can see your data">
        <p>
          You, and the administrators of this instance. Administrators can see your account details and activity (for
          example, when you last trained), and the error and slow-response records above, in order to run and support
          the service. They can&apos;t see your password.
        </p>
      </Section>

      <Section title="How long it is kept">
        <p>
          Your data is kept while your account exists, and deleted when you delete your account (next section). Used and
          expired sign-in codes and sessions stop working straight away, data exports are removed after{" "}
          {DATA_EXPORT_TTL_DAYS} days, error and slow-response records are deleted after {REQUEST_LOG_RETENTION_DAYS} days, and
          AI request records are deleted after one year. The server also keeps counts of how many requests it answered,
          how fast and with what result, per kind of action; these hold nothing about who made them.
        </p>
        <p>
          Copies of the database kept as backups, in case of a failure, are deleted after at most {BACKUP_RETENTION_DAYS}{" "}
          days, so anything deleted from the app is gone from them within that time too.
        </p>
      </Section>

      <Section id={PRIVACY_DELETION_SECTION_ID} title="Deleting your account">
        <p>
          You can delete your account in Settings, confirming with your password (or a code we send you). You are signed
          out on every device straight away, and the account is permanently deleted {ACCOUNT_DELETION_GRACE_DAYS} days
          later. If you sign in before then, you can cancel the deletion.
        </p>
        <p>
          On that date <strong>everything about you is deleted</strong>: your account and contact details, settings,
          body weight and goals, plans, every workout and set, check-ins, notifications and sessions. Error and
          slow-response records lose your account id and are deleted on their usual schedule, within{" "}
          {REQUEST_LOG_RETENTION_DAYS} days.
        </p>
        <p>
          Before that, your training is added to <strong>anonymous totals</strong> that we keep to understand how the app is
          used and to improve it: for each exercise and calendar month, the number of people, workouts, working sets and
          reps, summed over every deleted account. They hold no name, contact detail, account id, body weight, weights
          lifted, notes or dates finer than a month, and can&apos;t be linked back to you.
        </p>
      </Section>

      <Section title="Your choices">
        <List
          items={[
            <>See and correct your details in the app, under Profile and Settings.</>,
            <>Turn AI check-ins off at any time in Settings.</>,
            <>Download a copy of all your data in Settings (Your data). It is prepared in the background, and you get a notification when it is ready.</>,
            <>Delete your account and all its data in Settings (see above).</>,
            <>Anything else about your data: contact {contact}.</>,
          ]}
        />
      </Section>

      <Section title="Children">
        <p>The app is not meant for anyone under 16.</p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes, the date at the top changes too, and the app asks you to read and accept the new
          version before you carry on.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about your data: {contact}.</p>
      </Section>
    </div>
  );
}
