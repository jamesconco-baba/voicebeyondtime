"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/brand";
import { SetupNotice } from "@/components/setup-notice";

const NAV = [
  { href: "/dashboard", label: "Home", glyph: "⌂" },
  { href: "/vault", label: "Vault", glyph: "❑" },
  { href: "/messenger", label: "Messenger", glyph: "✦" },
  { href: "/timeline", label: "Timeline", glyph: "❘" },
  { href: "/circle", label: "Legacy Circle", glyph: "❍" },
  { href: "/settings", label: "Settings", glyph: "⚙" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data, ready, session, configured } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!configured) return; // setup notice below handles this
    if (!session) router.replace("/signin");
    else if (!data.onboarded) router.replace("/onboarding");
  }, [ready, session, configured, data.onboarded, router]);

  if (ready && !configured) return <SetupNotice />;

  if (!ready || !session || !data.profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-parchment text-sage">
        <div className="animate-pulse font-display text-lg">Opening your vault…</div>
      </div>
    );
  }

  const firstName = data.profile.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-parchment lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink/10 bg-ink px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo light />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                  active
                    ? "bg-parchment/10 text-parchment"
                    : "text-parchment/55 hover:bg-parchment/[0.06] hover:text-parchment/90"
                }`}
              >
                <span className={`w-4 text-center ${active ? "text-amber-soft" : ""}`}>
                  {n.glyph}
                </span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-xl bg-parchment/[0.06] px-3 py-3 text-sm text-parchment/70">
          <div className="font-medium text-parchment">{firstName}</div>
          <div className="text-xs text-parchment/50">Legacy creator</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-ink/10 bg-ink px-5 py-3.5 lg:hidden">
        <Logo light />
        <Link
          href="/settings"
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-parchment/15 text-parchment"
              : "text-parchment/70 hover:bg-parchment/10"
          }`}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-parchment/15 text-xs font-medium text-amber-soft">
            {firstName.charAt(0).toUpperCase()}
          </span>
          {firstName}
        </Link>
      </div>

      {/* Content */}
      <main className="min-w-0 pb-24 lg:pb-0">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-ink/10 bg-parchment-card px-2 py-2 lg:hidden">
        {NAV.slice(0, 5).map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[11px] ${
                active ? "text-clay" : "text-sage"
              }`}
            >
              <span className="text-base">{n.glyph}</span>
              {n.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
