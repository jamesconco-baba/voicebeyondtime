import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendClaimInviteEmail, sendNewMessageEmail } from "./email";

// Shared by the daily cron (date-triggered releases) and immediate ("send now")
// messages — one place that knows how to notify a recipient once something of theirs
// has actually been released.
export async function notifyRecipientOfRelease(
  admin: SupabaseClient,
  opts: { creatorUserId: string; beneficiaryId: string }
) {
  const { data: beneficiary } = await admin
    .from("beneficiaries")
    .select("id, name, email, claimed_by")
    .eq("id", opts.beneficiaryId)
    .maybeSingle();
  if (!beneficiary?.email) return { notified: false, reason: "no_email" as const };

  const { data: creatorProfile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", opts.creatorUserId)
    .maybeSingle();
  const creatorName = creatorProfile?.name || "Someone who cares about you";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://theamberapp.com";

  if (beneficiary.claimed_by) {
    await sendNewMessageEmail({
      to: beneficiary.email,
      recipientName: beneficiary.name,
      creatorName,
      signInUrl: `${origin}/received`,
    });
    return { notified: true, kind: "new_message" as const };
  }

  const { data: existingToken } = await admin
    .from("claim_tokens")
    .select("token, expires_at")
    .eq("beneficiary_id", beneficiary.id)
    .is("claimed_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .maybeSingle();

  let token = existingToken?.token as string | undefined;
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, "");
    await admin.from("claim_tokens").insert({
      user_id: opts.creatorUserId,
      beneficiary_id: beneficiary.id,
      token,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
  }

  await sendClaimInviteEmail({
    to: beneficiary.email,
    recipientName: beneficiary.name,
    creatorName,
    claimUrl: `${origin}/claim/${token}`,
  });
  return { notified: true, kind: "claim_invite" as const };
}
