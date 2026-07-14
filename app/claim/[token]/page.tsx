"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, Waveform } from "@/components/brand";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

interface ClaimInfo {
  valid: boolean;
  reason?: "not_found" | "expired";
  alreadyClaimed?: boolean;
  recipientName?: string;
  creatorName?: string;
  maskedEmail?: string;
  email?: string;
}

// The link a recipient opens when a release triggers. MVP identity model: access is
// gated entirely by the email address the creator registered for this recipient — we
// send a one-time 6-digit code there (never a clickable sign-in link), so typing that
// code back in is the proof of identity for now.
//
// Deliberately code-based rather than link-based: a clickable magic link can get
// silently "used up" by email link-scanners (iPhone Mail's link protection, corporate
// security scanners, etc.) before the person ever sees it, leaving them stuck. A code
// they type in themselves has no such failure mode.
export default function Claim({ params }: { params: { token: string } }) {
  const token = params.token;
  const router = useRouter();
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/claim/${token}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ valid: false, reason: "not_found" }));
  }, [token]);

  const sendCode = async () => {
    if (!info?.email) return;
    const supabase = getSupabase();
    if (!supabase) {
      setError("Amber isn't fully configured yet — try again shortly.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email: info.email });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const verify = async () => {
    if (!info?.email || code.trim().length < 6) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: info.email,
      token: code.trim(),
      type: "email",
    });
    if (verifyError) {
      setBusy(false);
      setError("That code didn't match. Check for a typo, or request a new one.");
      return;
    }
    // Session is established — finish linking this account to the beneficiary record.
    const res = await fetch(`/api/claim/${token}/complete`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Something went wrong finishing this up.");
      return;
    }
    router.push("/received");
  };

  return (
    <main className="flex min-h-screen flex-col bg-parchment">
      <header className="mx-auto flex w-full max-w-3xl items-center px-6 py-6">
        <Logo />
      </header>

      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        {!info && <p className="text-sm text-sage">One moment…</p>}

        {info && !info.valid && (
          <Card className="w-full p-6">
            <p className="font-display text-xl text-ink">
              {info.reason === "expired" ? "This link has expired." : "We couldn't find this invitation."}
            </p>
            <p className="mt-2 text-sm text-ink/70">
              If you were expecting something from Amber, ask the person who sent it to generate a new link.
            </p>
          </Card>
        )}

        {info?.valid && (
          <>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-clay">
              Someone kept this for you
            </p>
            <h1 className="font-display text-3xl leading-snug text-ink sm:text-4xl">
              There is something here,
              <br />
              <span className="italic text-amber">waiting for you.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/70">
              {info.creatorName} preserved messages and memories for you through Amber, to
              reach you when the time was right. That time has come.
            </p>

            <div className="my-8 text-amber-soft/70">
              <Waveform bars={40} className="!h-8" />
            </div>

            <Card className="w-full p-5 text-left">
              {!sent ? (
                <>
                  <p className="text-sm font-medium text-ink/80">To open what was left for you:</p>
                  <p className="mt-2 text-sm text-ink/70">
                    We'll send a 6-digit code to <span className="font-medium text-ink">{info.maskedEmail}</span> —
                    the email {info.creatorName} registered for you. No password needed.
                  </p>
                  {error && <p className="mt-3 text-sm text-clay">{error}</p>}
                  <div className="mt-5">
                    <Button onClick={sendCode} disabled={busy}>
                      {busy ? "Sending…" : "Send me a code"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-ink/80">Enter your code</p>
                  <p className="mt-2 text-sm text-ink/70">
                    We sent a 6-digit code to {info.maskedEmail}. It's valid for a few minutes.
                  </p>
                  <div className="mt-4">
                    <Field label="Code">
                      <input
                        className={inputClass}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && verify()}
                        placeholder="123456"
                        autoFocus
                      />
                    </Field>
                  </div>
                  {error && <p className="mt-3 text-sm text-clay">{error}</p>}
                  <div className="mt-4 flex items-center gap-3">
                    <Button onClick={verify} disabled={busy || code.trim().length < 6}>
                      {busy ? "Checking…" : "Continue"}
                    </Button>
                    <button
                      onClick={sendCode}
                      disabled={busy}
                      className="text-sm text-sage hover:text-clay hover:underline"
                    >
                      Resend code
                    </button>
                  </div>
                </>
              )}
            </Card>

            <p className="mt-6 text-xs text-sage">
              Invitation reference: <span className="font-mono">{token.slice(0, 12)}…</span>
            </p>
          </>
        )}
      </section>

      <footer className="mx-auto w-full max-w-3xl px-6 py-8 text-center text-sm text-sage">
        <Link href="/" className="hover:underline">
          A place for what matters most.
        </Link>
      </footer>
    </main>
  );
}
