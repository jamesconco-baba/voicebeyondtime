"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui";
import {
  MockTimeline,
  MockVault,
  MockScheduled,
  MockAssistant,
} from "@/components/landing-mocks";

export default function Landing() {
  const { session, ready } = useStore();
  const router = useRouter();
  const signedIn = ready && !!session;
  const enter = () => router.push(signedIn ? "/dashboard" : "/signup");

  return (
    <main className="bg-parchment">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-parchment/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => router.push(signedIn ? "/dashboard" : "/signin")}>
            {signedIn ? "Open my vault" : "Sign in"}
          </Button>
        </div>
      </header>

      {/* Hero — text + a real screen from the app */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-clay">
              <span className="h-px w-8 bg-clay/50" /> Digital legacy preservation
            </p>
            <h1 className="font-display text-5xl leading-[1.06] text-ink sm:text-6xl">
              Your voice.
              <br />
              Their future.
              <br />
              <span className="italic text-amber">A legacy that lives on.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
              Preserve your stories and messages — and deliver them to the people you love,
              exactly when they&apos;ll matter most.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button onClick={enter}>{signedIn ? "Open my vault" : "Start preserving"}</Button>
              {!signedIn && (
                <Button variant="outline" onClick={() => router.push("/signin")}>
                  Sign in
                </Button>
              )}
            </div>
            <p className="mt-4 text-sm text-sage">Free to begin · Your content stays private to you</p>
          </div>

          <div className="relative">
            <MockTimeline />
            <div className="absolute -bottom-4 -right-4 -z-0 h-full w-full rounded-xl2 border border-amber/40" />
          </div>
        </div>
      </section>

      {/* Story row 1 — Preserve */}
      <section className="border-t border-ink/10 bg-parchment-card">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <MockVault />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Preserve</p>
            <h2 className="mt-2 font-display text-3xl leading-snug text-ink">
              Capture it in your own voice.
            </h2>
            <p className="mt-3 max-w-md text-[17px] leading-relaxed text-ink/70">
              Voice notes, letters, photos, and documents — the pieces of your story, kept
              together in one secure place.
            </p>
          </div>
        </div>
      </section>

      {/* Story row 2 — Deliver */}
      <section>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Deliver across time</p>
            <h2 className="mt-2 font-display text-3xl leading-snug text-ink">
              Sealed until the moment it&apos;s meant for.
            </h2>
            <p className="mt-3 max-w-md text-[17px] leading-relaxed text-ink/70">
              Tie a message to a birthday, a graduation, a wedding — this year or decades
              from now. It waits, then finds them.
            </p>
          </div>
          <MockScheduled />
        </div>
      </section>

      {/* Story row 3 — AI, the trust segment */}
      <section className="border-y border-ink/10 bg-parchment-card">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <MockAssistant />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">Meet the legacy</p>
            <h2 className="mt-2 font-display text-3xl leading-snug text-ink">
              Ask the legacy. Hear only what was real.
            </h2>
            <p className="mt-3 max-w-md text-[17px] leading-relaxed text-ink/70">
              Family can ask questions and get answers drawn only from what you preserved —
              never invented, reviewed by the Guardian, and always pointing back to your own
              words.
            </p>
          </div>
        </div>
      </section>

      {/* On the horizon — coming soon */}
      <section className="border-t border-ink/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-clay">On the horizon</p>
            <h2 className="mt-3 font-display text-3xl leading-snug text-ink sm:text-4xl">
              Built in the open, and still growing.
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink/70">
              What&apos;s live today is only the beginning. Here&apos;s what we&apos;re
              building next — and we&apos;ll say so honestly until each one arrives.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { glyph: "◍", name: "Voice narration", desc: "Hear your written words read aloud in your own voice — opt-in, revocable, and always disclosed as synthetic." },
              { glyph: "✎", name: "Automatic transcription", desc: "Every recording turned into searchable, quotable text, ready for the assistant and your memoir." },
              { glyph: "❖", name: "Advisor & Family Office", desc: "Multi-client tools for estate planners, with the compliance and audit trails succession work needs." },
              { glyph: "⬡", name: "End-to-end encryption & MFA", desc: "Zero-knowledge options and multi-factor sign-in for the most sensitive legacies." },
              { glyph: "▢", name: "Native mobile apps", desc: "Voice Beyond Time on iOS and Android, so a memory can be captured the moment it arrives." },
              { glyph: "⚖", name: "Estate-planning integrations", desc: "Connect your digital legacy to wills and succession documents for a complete plan." },
            ].map((f) => (
              <div
                key={f.name}
                className="relative rounded-xl2 border border-dashed border-ink/15 bg-parchment-card/60 p-6"
              >
                <span className="absolute right-4 top-4 rounded-full border border-ink/15 px-2 py-0.5 text-[11px] font-medium text-ink/45">
                  Coming soon
                </span>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-wash text-lg text-clay">
                  {f.glyph}
                </span>
                <h3 className="mt-4 font-display text-xl text-ink">{f.name}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-display text-3xl leading-snug text-ink sm:text-4xl">
          Begin your legacy today.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-ink/70">
          Preserve one memory this week. It costs nothing to start.
        </p>
        <div className="mt-8 flex justify-center">
          <Button onClick={enter}>{signedIn ? "Open my vault" : "Start preserving"}</Button>
        </div>
        <p className="mt-4 text-sm text-sage">Preserve · Schedule · Pass on</p>
      </section>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-sage sm:flex-row">
          <Logo />
          <span>A place for what matters most.</span>
        </div>
      </footer>
    </main>
  );
}
