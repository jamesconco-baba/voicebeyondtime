import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notifyRecipientOfRelease } from "@/lib/release";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Cron hits this once a day (see vercel.json). Protected by a shared secret so
// it can't be triggered by anyone who finds the URL — Vercel Cron sends this header
// automatically when CRON_SECRET is set in the project's environment variables.
function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const today = new Date().toISOString().slice(0, 10);

  // MVP scope: only date-triggered messages release automatically. Milestone-triggered
  // messages go through the Inheritance module's verification-event flow instead
  // (creator- or executor-confirmed), and immediate-trigger messages are notified at
  // creation time in the app itself (see lib/release.ts).
  const { data: due, error } = await admin
    .from("scheduled_messages")
    .select("id, user_id, beneficiary_id")
    .eq("status", "scheduled")
    .eq("trigger", "date")
    .lte("release_date", today);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due || due.length === 0) return NextResponse.json({ released: 0 });

  let released = 0;
  let emailed = 0;
  const errors: string[] = [];

  for (const msg of due) {
    try {
      await admin.from("scheduled_messages").update({ status: "delivered" }).eq("id", msg.id);
      released++;

      if (!msg.beneficiary_id) continue; // no recipient attached — nothing to notify

      const result = await notifyRecipientOfRelease(admin, {
        creatorUserId: msg.user_id,
        beneficiaryId: msg.beneficiary_id,
      });
      if (result.notified) emailed++;
    } catch (e) {
      errors.push(`${msg.id}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ released, emailed, errors: errors.length ? errors : undefined });
}
