"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo, Waveform } from "@/components/brand";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

interface ReceivedItem {
  messageId: string;
  title: string;
  note: string | null;
  deliveredAt: string;
  content: {
    type: string;
    title: string;
    note: string | null;
    transcript: string | null;
    mediaUrl: string | null;
    mediaMime: string | null;
    mediaDuration: number | null;
  } | null;
}
interface ReceivedGroup {
  creatorName: string;
  recipientName: string;
  items: ReceivedItem[];
}

function SignInGate() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Amber isn't fully configured yet.");
      return;
    }
    setBusy(true);
    setError("");
    const origin = window.location.origin;
    // shouldCreateUser: false — this entry point only lets someone sign back in to an
    // account that already exists from claiming an invitation; it can't be used to
    // create a brand-new account, unlike the /claim/[token] flow.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${origin}/auth/callback?next=/received`, shouldCreateUser: false },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-parchment px-6 text-center">
      <Logo />
      <div className="my-8 text-amber-soft/70">
        <Waveform bars={40} className="!h-8" />
      </div>
      <Card className="w-full max-w-sm p-5 text-left">
        {!sent ? (
          <>
            <p className="text-sm font-medium text-ink/80">Welcome back</p>
            <p className="mt-1 text-sm text-ink/70">
              Enter the email that was registered for you, and we'll send a sign-in link.
            </p>
            <div className="mt-4">
              <Field label="Email">
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="you@example.com"
                  autoFocus
                />
              </Field>
            </div>
            {error && <p className="mt-2 text-sm text-clay">{error}</p>}
            <div className="mt-4">
              <Button onClick={submit} disabled={busy || !email.trim()} className="w-full">
                {busy ? "Sending…" : "Send sign-in link"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink/70">
            If that email is registered with Amber, a sign-in link is on its way. Open it on this device.
          </p>
        )}
      </Card>
    </main>
  );
}

function MediaBlock({ item }: { item: ReceivedItem }) {
  const c = item.content;
  if (!c) return null;
  if (c.mediaUrl && c.type === "voice") {
    return <audio controls src={c.mediaUrl} className="mt-3 w-full" />;
  }
  if (c.mediaUrl && c.type === "video") {
    return <video controls src={c.mediaUrl} className="mt-3 w-full rounded-lg" />;
  }
  if (c.mediaUrl && c.type === "photo") {
    return <img src={c.mediaUrl} alt={c.title} className="mt-3 w-full rounded-lg" />;
  }
  if (c.mediaUrl) {
    return (
      <a href={c.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-clay hover:underline">
        Open attachment ↗
      </a>
    );
  }
  return null;
}

function Dashboard({ groups }: { groups: ReceivedGroup[] }) {
  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <main className="min-h-screen bg-parchment">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Logo />
        <button
          onClick={() => getSupabase()?.auth.signOut().then(() => window.location.reload())}
          className="text-sm text-sage hover:text-clay hover:underline"
        >
          Sign out
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-6 pb-24">
        {totalItems === 0 && (
          <Card className="p-6 text-center">
            <p className="font-display text-lg text-ink">Nothing has arrived yet.</p>
            <p className="mt-2 text-sm text-ink/70">
              When something is preserved for you and its time comes, it will appear here — and we'll email
              you.
            </p>
          </Card>
        )}

        {groups.map((group) => (
          <section key={group.creatorName} className="mb-8">
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-clay">
              From {group.creatorName}
            </p>
            <p className="mb-4 font-display text-2xl text-ink">Welcome, {group.recipientName}.</p>
            <div className="flex flex-col gap-3">
              {group.items.map((item) => (
                <Card key={item.messageId} className="p-4">
                  <p className="text-[15px] font-medium text-ink">{item.title}</p>
                  {item.note && <p className="mt-1 text-sm text-ink/70">{item.note}</p>}
                  {item.content?.transcript && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                      {item.content.transcript}
                    </p>
                  )}
                  <MediaBlock item={item} />
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="pb-10 text-center text-xs text-sage">
        <Link href="/" className="hover:underline">
          Preserved through Amber
        </Link>
      </footer>
    </main>
  );
}

export default function Received() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [groups, setGroups] = useState<ReceivedGroup[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/received")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load.");
        setGroups(json.groups);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, [signedIn]);

  if (checking) return null;
  if (!signedIn) return <SignInGate />;
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-parchment px-6">
        <Card className="max-w-sm p-5 text-center text-sm text-clay">{error}</Card>
      </main>
    );
  }
  if (!groups) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-parchment">
        <p className="text-sm text-sage">Loading…</p>
      </main>
    );
  }
  return <Dashboard groups={groups} />;
}
