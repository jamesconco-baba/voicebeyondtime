"use client";

import { Waveform } from "./brand";

// A framed "app window" so the mocks read clearly as screens from the product.
export function AppWindow({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl2 border border-ink/10 bg-parchment-card shadow-lift ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-ink/10 bg-ink px-4 py-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-parchment/15 text-amber-soft">
          <Waveform bars={4} className="!h-3 !gap-[2px]" />
        </span>
        <span className="font-display text-sm text-parchment">{title}</span>
        <span className="ml-auto flex gap-1.5">
          <i className="h-2 w-2 rounded-full bg-parchment/25" />
          <i className="h-2 w-2 rounded-full bg-parchment/25" />
          <i className="h-2 w-2 rounded-full bg-parchment/25" />
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/* -------------------------------------------------- Timeline */
export function MockTimeline() {
  const nodes = [
    { date: "Aug 2033 · upcoming", title: "On your 18th birthday", meta: "Scheduled release · Amara", future: true, glyph: "✦" },
    { date: "Jun 2026", title: "What hard work has meant to me", meta: "Letter", glyph: "✎" },
    { date: "Apr 2026", title: "A good morning, the way I'd say it", meta: "Voice note", glyph: "◍", wave: true },
  ];
  return (
    <AppWindow title="Timeline">
      <div className="relative pl-7">
        <div className="absolute bottom-2 left-[9px] top-2 w-px bg-ink/15" />
        <ul className="space-y-3">
          {nodes.map((n, i) => (
            <li key={i} className="relative">
              <span
                className={`absolute -left-7 top-1.5 grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                  n.future ? "bg-amber-wash text-clay" : "bg-ink text-amber-soft"
                }`}
              >
                {n.glyph}
              </span>
              <div className="rounded-xl border border-ink/[0.07] bg-parchment/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-sage">{n.date}</p>
                    <p className="truncate font-display text-[15px] text-ink">{n.title}</p>
                    <p className="text-xs text-sage">{n.meta}</p>
                  </div>
                  {n.wave && (
                    <div className="hidden text-amber-soft sm:block">
                      <Waveform bars={12} className="!h-5" />
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppWindow>
  );
}

/* -------------------------------------------------- Vault */
export function MockVault() {
  return (
    <AppWindow title="Vault">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-ink/[0.07] bg-parchment/60 p-3">
          <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-amber-wash/70 text-amber-soft">
            <Waveform bars={18} className="!h-6 text-clay" />
          </div>
          <p className="text-[11px] text-sage">Voice note · 0:47</p>
          <p className="font-display text-[14px] leading-tight text-ink">A good morning</p>
        </div>
        <div className="rounded-xl border border-ink/[0.07] bg-parchment/60 p-3">
          <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-ink/[0.06] text-2xl text-clay">
            ✎
          </div>
          <p className="text-[11px] text-sage">Letter</p>
          <p className="font-display text-[14px] leading-tight text-ink">On hard work</p>
        </div>
        <div className="rounded-xl border border-ink/[0.07] bg-parchment/60 p-3">
          <div className="mb-2 h-16 rounded-lg bg-gradient-to-br from-amber-soft/60 to-clay/50" />
          <p className="text-[11px] text-sage">Photo</p>
          <p className="font-display text-[14px] leading-tight text-ink">The house in Enugu</p>
        </div>
        <div className="rounded-xl border border-ink/[0.07] bg-parchment/60 p-3">
          <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-ink/[0.06] text-2xl text-clay">
            ❧
          </div>
          <p className="text-[11px] text-sage">Document</p>
          <p className="font-display text-[14px] leading-tight text-ink">Our family recipes</p>
        </div>
      </div>
    </AppWindow>
  );
}

/* -------------------------------------------------- Scheduled message */
export function MockScheduled() {
  return (
    <AppWindow title="Messenger">
      <div className="rounded-xl2 bg-ink p-5 text-parchment">
        <div className="flex items-center justify-between">
          <p className="text-xs text-amber-soft">For your graduation day</p>
          <span className="rounded-full bg-amber-wash px-2.5 py-0.5 text-[11px] font-medium text-clay">
            Scheduled
          </span>
        </div>
        <p className="mt-1 font-display text-lg italic leading-snug text-parchment/95">
          &ldquo;Whatever you chose to study, I&apos;m proud of you.&rdquo;
        </p>
        <div className="my-4 text-amber-soft">
          <Waveform bars={32} className="!h-7" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-parchment/60">
          <span>Milestone · Graduation</span>
          <span>For Chidi</span>
        </div>
      </div>
    </AppWindow>
  );
}

/* -------------------------------------------------- AI Assistant */
export function MockAssistant() {
  return (
    <AppWindow title="Legacy Assistant">
      <div className="mb-3 flex items-center gap-2 text-[11px] text-sage">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-2 py-0.5 text-sage">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Guardian active
        </span>
        <span>Grounded in your memories</span>
      </div>
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl bg-ink px-3.5 py-2 text-[13px] text-parchment">
            What did Dad believe about hard work?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[88%] rounded-2xl bg-parchment/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">
            He came back to it often: that consistency mattered more than intensity, and
            that showing up on the hard days was the whole point.
            <div className="mt-2.5 border-t border-ink/10 pt-2">
              <p className="mb-1.5 text-[10px] font-medium text-sage">From your vault</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-amber-wash px-2 py-0.5 text-[10px] text-clay">
                  On hard work
                </span>
                <span className="rounded-full bg-amber-wash px-2 py-0.5 text-[10px] text-clay">
                  A letter for your graduation
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-ink/15 bg-parchment/60 px-3.5 py-2 text-[13px] text-sage">
        Ask the legacy a question…
        <span className="ml-auto rounded-full bg-ink px-3 py-1 text-[12px] text-parchment">Ask</span>
      </div>
    </AppWindow>
  );
}
