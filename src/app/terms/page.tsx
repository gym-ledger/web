import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  OPERATOR_NAME,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_POLICY_UPDATED,
  TERMS_GOVERNING_LAW,
} from "@/lib/privacy-policy";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using this app, what it is and isn't, and who is responsible for what.",
};

// Public: readable before signing in. Accepted together with the privacy
// policy; bump PRIVACY_POLICY_VERSION when this text changes.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-line pt-5">
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

export default function TermsPage() {
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
        <h1 className="font-display text-[32px] leading-none font-bold">Terms of use</h1>
        <p className="text-[13px] text-muted-foreground">Last updated {PRIVACY_POLICY_UPDATED}</p>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          This copy of the app is run by <strong className="text-foreground">{OPERATOR_NAME}</strong> (&quot;we&quot;). By
          creating an account or using the app you agree to these terms and to the{" "}
          <Link href="/privacy" className="font-semibold text-primary">
            privacy policy
          </Link>
          . If you don&apos;t agree, please don&apos;t use the app.
        </p>
      </header>

      <Section title="Who can use it">
        <List
          items={[
            <>You must be at least 16 years old.</>,
            <>One account per person. Keep your sign-in codes and password to yourself; you are responsible for what happens in your account.</>,
            <>Give an email address or phone number that is yours.</>,
          ]}
        />
      </Section>

      <Section title="Not medical advice">
        <p>
          The app helps you log training and body weight and shows numbers worked out from them. Plans, progress figures,
          goal paces, calorie guidelines and AI check-in notes are <strong>general information, not medical, dietary or
          professional advice</strong>, and they can be wrong.
        </p>
        <p>
          Exercise carries a risk of injury. Check with a doctor before starting or changing a training or diet programme,
          especially if you have a health condition, and stop if something hurts. You train at your own risk.
        </p>
      </Section>

      <Section title="Your data">
        <p>
          What you log stays yours. You let us store and process it only to run the app for you, as the privacy policy
          describes. You can download a copy of it, or delete your account, at any time in Settings.
        </p>
      </Section>

      <Section title="Using the app fairly">
        <p>Don&apos;t:</p>
        <List
          items={[
            <>try to get into other people&apos;s accounts or data, or past the app&apos;s security;</>,
            <>overload the service, or request sign-in codes for numbers or addresses that aren&apos;t yours;</>,
            <>scrape or copy the service with automated tools, or use it for anything unlawful.</>,
          ]}
        />
        <p>We may suspend or close an account that does these things.</p>
      </Section>

      <Section title="The service">
        <p>
          The app is provided <strong>as is</strong>, without warranties of any kind. We try to keep it running and your
          data safe, but it may sometimes be unavailable, change, lose features, or stop altogether; where we can, we will
          give notice first so you can download your data.
        </p>
        <p>
          The app&apos;s code is free, open-source software under the MIT licence. Anyone can run their own copy; these
          terms cover only this one.
        </p>
      </Section>

      <Section title="Ending your account">
        <p>
          You can delete your account in Settings. It is signed out everywhere straight away and deleted for good{" "}
          {ACCOUNT_DELETION_GRACE_DAYS} days later; signing in before then lets you cancel.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          As far as the law allows, we are not liable for indirect or consequential loss, for injury arising from training,
          or for loss caused by the service being unavailable or by data being lost. Nothing in these terms limits a
          liability or a consumer right that the law doesn&apos;t allow to be limited.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If these terms change, the date at the top changes too, and the app asks you to read and accept them again
          before you carry on.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of {TERMS_GOVERNING_LAW}, and disputes are subject to the jurisdiction of
          its courts.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about these terms: {contact}.</p>
      </Section>
    </div>
  );
}
