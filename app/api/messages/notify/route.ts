import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { notifyRecipientOfRelease } from "@/lib/release";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { beneficiaryId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.beneficiaryId) return NextResponse.json({ error: "beneficiaryId is required." }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 501 });

  // Confirm this beneficiary actually belongs to the caller before emailing anyone —
  // the service-role client bypasses RLS, so this check is the real boundary here.
  const { data: beneficiary } = await admin
    .from("beneficiaries")
    .select("id, user_id")
    .eq("id", body.beneficiaryId)
    .maybeSingle();
  if (!beneficiary || beneficiary.user_id !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const result = await notifyRecipientOfRelease(admin, {
    creatorUserId: user.id,
    beneficiaryId: body.beneficiaryId,
  });
  return NextResponse.json(result);
}
