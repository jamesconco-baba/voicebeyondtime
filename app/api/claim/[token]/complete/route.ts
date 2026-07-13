import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const { data: claim } = await admin
    .from("claim_tokens")
    .select("id, beneficiary_id, expires_at, claimed_at")
    .eq("token", params.token)
    .maybeSingle();
  if (!claim) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  if (claim.expires_at && new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }

  const { data: beneficiary } = await admin
    .from("beneficiaries")
    .select("id, email, claimed_by, user_id")
    .eq("id", claim.beneficiary_id)
    .maybeSingle();
  if (!beneficiary) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  // Defense in depth: even though the sign-in link only ever reaches the registered
  // email, re-confirm the authenticated session's email matches exactly before
  // linking this account to someone else's preserved content.
  if (beneficiary.email?.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invitation was sent to a different email address." },
      { status: 403 }
    );
  }

  // Already claimed by this same account — fine, just confirm.
  if (beneficiary.claimed_by && beneficiary.claimed_by !== user.id) {
    return NextResponse.json({ error: "This has already been claimed by someone else." }, { status: 409 });
  }

  await admin.from("beneficiaries").update({ claimed_by: user.id }).eq("id", beneficiary.id);
  await admin.from("claim_tokens").update({ claimed_at: new Date().toISOString() }).eq("id", claim.id);
  // profiles.role already defaults to 'creator' (schema-inheritance.sql) — mark this
  // account as a recipient too. A person could plausibly be both eventually; for MVP
  // this just records that they've claimed at least one thing.
  await admin.from("profiles").upsert({ id: user.id, role: "beneficiary" });
  await admin.from("release_audit").insert({
    user_id: beneficiary.user_id,
    action: `Recipient claimed access (${user.email})`,
    actor: "recipient",
  });

  return NextResponse.json({ ok: true });
}
