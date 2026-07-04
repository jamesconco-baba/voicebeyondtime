"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, inputClass } from "@/components/ui";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  const submit = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    if (password.length < 6) {
      setError("At least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  return (
    <AuthShell
      title={done ? "Password updated" : "Set a new password"}
      subtitle={
        done
          ? "You're all set. Taking you to your vault…"
          : "Choose a new password for your Amber account."
      }
      footer={
        <Link href="/signin" className="text-clay hover:underline">
          Back to sign in
        </Link>
      }
    >
      {done ? null : checking ? (
        <p className="text-sm text-sage">Checking your reset link…</p>
      ) : !hasSession ? (
        <p className="text-[15px] leading-relaxed text-ink/75">
          This page opens from the reset link in your email. Please use that link, or request a
          new one from the{" "}
          <Link href="/signin" className="text-clay hover:underline">
            sign-in page
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-4">
          <Field label="New password" hint="At least 6 characters.">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
              autoFocus
            />
          </Field>
          {error && <p className="text-sm text-clay">{error}</p>}
          <Button onClick={submit} disabled={busy || password.length < 6} className="w-full">
            {busy ? "Saving…" : "Update password"}
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
