"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <Link
          href="/login"
          className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email address
                  </label>
                  <Input
                    type="email"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl text-base"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-12 rounded-xl text-base font-semibold"
                >
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="size-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Check your email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="text-foreground font-medium">{email}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t receive it?{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary hover:underline"
                >
                  Try again
                </button>
              </p>
              <Link href="/login">
                <Button variant="outline" className="mt-2 rounded-xl">
                  Back to login
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
