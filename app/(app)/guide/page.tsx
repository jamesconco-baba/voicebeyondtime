"use client";

import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";

interface Section {
  glyph: string;
  title: string;
  href?: string;
  body: string;
  steps?: string[];
}

const SECTIONS: Section[] = [
  {
    glyph: "❑",
    title: "The Vault — preserve a memory",
    href: "/vault",
    body: "The Vault holds everything you preserve: voice recordings, written letters, photos, videos, and documents.",
    steps: [
      "Tap “Preserve a memory” anywhere you see it.",
      "Choose to record your voice, write a letter, or upload a file.",
      "Give it a title, add an optional note or transcript, and a few tags.",
      "Choose who it’s for (or leave it for your whole circle), and whether to include it in the AI assistant.",
    ],
  },
  {
    glyph: "✦",
    title: "Guided prompts — never face a blank page",
    href: "/dashboard",
    body: "Not sure what to record? The Home screen offers a gentle prompt each day (“What did you want them to know on their wedding day?”). Tap “Answer this” to preserve a memory around it.",
  },
  {
    glyph: "❍",
    title: "Your Legacy Circle — who you’re preserving for",
    href: "/circle",
    body: "Add the people your legacy is meant for — children, grandchildren, a spouse. You can address specific memories and messages to them, and link them into your Family Tree.",
    steps: [
      "Open Legacy Circle and add each person with their relationship.",
      "Optionally add a birthday, which helps suggest milestone dates later.",
    ],
  },
  {
    glyph: "✦",
    title: "Messenger — deliver a message in the future",
    href: "/messenger",
    body: "Tie a message to a moment: a specific date, or a life milestone like a graduation or wedding. It stays sealed until then.",
    steps: [
      "Open Messenger and tap “Schedule a message”.",
      "Write the message (or attach a memory from your Vault) and choose a recipient.",
      "Pick when it releases — a milestone, a date, or right away.",
      "Track everything as Draft, Scheduled, or Delivered.",
    ],
  },
  {
    glyph: "⚵",
    title: "Inheritance — making sure it reaches them",
    href: "/inheritance",
    body: "This is how your messages actually reach someone years from now, even if their email changes or you’re no longer here.",
    steps: [
      "Add each recipient with more than one way to reach them, plus a trusted steward who can help find them.",
      "For sensitive releases, name an executor and set a life-event trigger with a safety waiting period.",
      "When a trigger fires, the recipient gets a secure link to claim and verify their vault — the audit log records every step.",
    ],
  },
  {
    glyph: "❘",
    title: "Timeline — your life story as you build it",
    href: "/timeline",
    body: "Everything you preserve, and every future release, appears on a single chronological thread — a throughline of your story that grows over time.",
  },
  {
    glyph: "❖",
    title: "Memories — collections",
    href: "/memories",
    body: "Your memories, gathered into meaningful groups: by the person they’re for, by when you made them, or — with the AI — by theme.",
  },
  {
    glyph: "❋",
    title: "Legacy Assistant — ask the legacy",
    href: "/assistant",
    body: "Your family can ask questions and get answers drawn only from what you preserved — never invented. Each answer points back to the original memory, and the Guardian reviews every response for accuracy and gentleness before it’s shown.",
  },
  {
    glyph: "❧",
    title: "Books — your memoir",
    href: "/books",
    body: "Turn your preserved letters and memories into a warm memoir draft, composed only from your own words. Review, edit, and download it.",
  },
  {
    glyph: "⚶",
    title: "Family Tree",
    href: "/family",
    body: "Map the people in your story across generations, and link each person to the memories that belong to them.",
  },
];

export default function Guide() {
  return (
    <div>
      <PageHeader
        eyebrow="How to Use"
        title="Getting the most from Voice Beyond Time"
        subtitle="A quick tour of each part. There’s no right order — start by preserving one memory, and build from there."
      />

      <Card className="mb-6 !border-ink !bg-ink p-6 text-parchment">
        <h2 className="font-display text-xl text-parchment">A good first hour</h2>
        <ol className="mt-3 space-y-1.5 text-[15px] text-parchment/85">
          <li>1. Add one or two people to your Legacy Circle.</li>
          <li>2. Answer today’s prompt on Home — record it in your own voice.</li>
          <li>3. Schedule one message for a milestone that matters.</li>
          <li>4. That’s a real beginning. Come back whenever a memory comes to mind.</li>
        </ol>
      </Card>

      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-5">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-wash text-lg text-clay">
                {s.glyph}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg text-ink">{s.title}</h2>
                  {s.href && (
                    <Link href={s.href} className="text-sm text-clay hover:underline">
                      Open →
                    </Link>
                  )}
                </div>
                <p className="mt-1 text-[15px] leading-relaxed text-ink/75">{s.body}</p>
                {s.steps && (
                  <ol className="mt-3 space-y-1.5 text-sm text-ink/70">
                    {s.steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-clay">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="mb-2 font-display text-lg text-ink">Your privacy</h2>
        <p className="text-[15px] leading-relaxed text-ink/75">
          Your account, memories, and messages are private to you. Media is kept in private
          storage, and access rules mean each account can only ever see its own content. You
          choose, per memory, whether the AI may use it — and you can turn that off for
          anything private without changing who receives the memory itself.
        </p>
      </Card>
    </div>
  );
}
