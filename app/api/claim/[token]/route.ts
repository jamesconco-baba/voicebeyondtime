import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}${"*".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const { data: claim } = await admin
    .from("claim_tokens")
    .select("id, beneficiary_id, expires_at, claimed_at")
    .eq("token", params.token)
    .maybeSingle();

  if (!claim) return NextResponse.json({ valid: false, reason: "not_found" });
  if (claim.expires_at && new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  const { data: beneficiary } = await admin
    .from("beneficiaries")
    .select("id, name, email, user_id, claimed_by")
    .eq("id", claim.beneficiary_id)
    .maybeSingle();

  if (!beneficiary || !beneficiary.email) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }

  const { data: creatorProfile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", beneficiary.user_id)
    .maybeSingle();

  return NextResponse.json({
    valid: true,
    alreadyClaimed: Boolean(beneficiary.claimed_by),
    recipientName: beneficiary.name,
    creatorName: creatorProfile?.name || "Someone who cares about you",
    maskedEmail: maskEmail(beneficiary.email),
    // Needed client-side to fire the OTP request — safe to return, since only the
    // holder of this hard-to-guess token URL ever sees it, same trust boundary as
    // the link itself.
    email: beneficiary.email,
  });
}
