"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button, Field, inputClass } from "@/components/ui";

// Split out because it reads useSearchParams — Next.js's App Router requires a
// Suspense boundary around any component that does, or `next build` fails outright.
function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentReset, setSentReset] = useState(false);

  const forgot = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase isn't configured yet. Add your project keys to .env.local.");
      return;
    }
    if (!email.trim()) {
      setError("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setError(error.message);
    else setSentReset(true);
  };

  const submit = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase isn't configured yet. Add your project keys to .env.local.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // Send to onboarding if the profile isn't complete yet, else the vault.
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    let onboarded = false;
    if (uid) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", uid)
        .maybeSingle();
      onboarded = Boolean(prof?.onboarded);
    }
    // If we were sent here from a specific page (e.g. /admin), go back there once
    // signed in — otherwise fall back to onboarding-if-needed, then the vault.
    if (next && onboarded) {
      router.push(next);
      return;
    }
    router.push(onboarded ? "/dashboard" : "/onboarding");
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your vault."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-clay hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••••••"
          />
        </Field>
        <div className="-mt-1 text-right">
          <button
            type="button"
            onClick={forgot}
            className="text-sm text-sage hover:text-clay hover:underline"
          >
            Forgot password?
          </button>
        </div>
        {sentReset && (
          <p className="text-sm text-sage">
            If an account exists for that email, a reset link is on its way.
          </p>
        )}
        {error && <p className="text-sm text-clay">{error}</p>}
        <Button onClick={submit} disabled={busy || !email.trim() || !password} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </AuthShell>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
