import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  // Safety net, shared with the mobile app's equivalent Edge Function: if this exact
  // verified email has an unclaimed beneficiary row waiting, link it now. Covers cases
  // where a claim-link flow was interrupted or failed partway for any reason.
  if (user.email) {
    await admin
      .from("beneficiaries")
      .update({ claimed_by: user.id })
      .is("claimed_by", null)
      .ilike("email", user.email);
  }

  // A person may have been claimed as a recipient by more than one creator (e.g. both
  // parents used Amber separately) — surface everything claimed to this account.
  const { data: beneficiaryRows } = await admin
    .from("beneficiaries")
    .select("id, name, user_id")
    .eq("claimed_by", user.id);

  if (!beneficiaryRows || beneficiaryRows.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  const creatorIds = Array.from(new Set(beneficiaryRows.map((b) => b.user_id)));
  const { data: creators } = await admin.from("profiles").select("id, name").in("id", creatorIds);
  const creatorNameById = new Map((creators ?? []).map((c) => [c.id, c.name || "Someone who cares about you"]));

  const beneficiaryIds = beneficiaryRows.map((b) => b.id);

  // Only ever release messages the creator has actually marked delivered — never
  // draft or still-scheduled ones, regardless of what a client might ask for.
  const { data: messages } = await admin
    .from("scheduled_messages")
    .select("id, title, note, content_id, beneficiary_id, created_at")
    .in("beneficiary_id", beneficiaryIds)
    .eq("status", "delivered")
    .order("created_at", { ascending: false });

  const contentIds = Array.from(new Set((messages ?? []).map((m) => m.content_id).filter(Boolean))) as string[];
  const { data: content } =
    contentIds.length > 0
      ? await admin
          .from("content_items")
          .select("id, type, title, note, transcript, media_path, media_mime, media_duration")
          .in("id", contentIds)
      : { data: [] };
  const contentById = new Map((content ?? []).map((c) => [c.id, c]));

  // Signed URLs for any attached media — the vault bucket is private, so recipients
  // need a time-limited signed link rather than a raw storage path.
  const signedUrlByPath = new Map<string, string>();
  for (const c of content ?? []) {
    if (!c.media_path) continue;
    const { data: signed } = await admin.storage.from("vault").createSignedUrl(c.media_path, 3600);
    if (signed?.signedUrl) signedUrlByPath.set(c.media_path, signed.signedUrl);
  }

  const beneficiaryById = new Map(beneficiaryRows.map((b) => [b.id, b]));

  const groups = creatorIds.map((creatorId) => {
    const myBeneficiaryIds = beneficiaryRows.filter((b) => b.user_id === creatorId).map((b) => b.id);
    const items = (messages ?? [])
      .filter((m) => myBeneficiaryIds.includes(m.beneficiary_id as string))
      .map((m) => {
        const c = m.content_id ? contentById.get(m.content_id) : null;
        return {
          messageId: m.id,
          title: m.title,
          note: m.note,
          deliveredAt: m.created_at,
          content: c
            ? {
                type: c.type,
                title: c.title,
                note: c.note,
                transcript: c.transcript,
                mediaUrl: c.media_path ? signedUrlByPath.get(c.media_path) ?? null : null,
                mediaMime: c.media_mime,
                mediaDuration: c.media_duration,
              }
            : null,
        };
      });
    return {
      creatorName: creatorNameById.get(creatorId),
      recipientName: beneficiaryById.get(myBeneficiaryIds[0])?.name ?? user.email,
      items,
    };
  });

  return NextResponse.json({ groups });
}
