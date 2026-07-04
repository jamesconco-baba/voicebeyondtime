"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase/client";
import {
  VBTData,
  Profile,
  Beneficiary,
  ContentItem,
  MediaItem,
  ScheduledMessage,
  FamilyMember,
} from "./types";
import { typeFromMime } from "./media";

// ---------------------------------------------------------------------------
// Supabase-backed store.
//
// Components talk only to `useStore()`. Data lives in Postgres (row-level
// security scopes every read/write to the signed-in user) and media lives in
// the private "vault" storage bucket. Mutating methods are async.
// ---------------------------------------------------------------------------

const EMPTY: VBTData = {
  profile: null,
  beneficiaries: [],
  content: [],
  messages: [],
  family: [],
  onboarded: false,
};

const SIGNED_URL_TTL = 60 * 60; // 1 hour

function mimeToExt(mime: string) {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("mpeg")) return "mp4";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("pdf")) return "pdf";
  const guess = mime.split("/")[1];
  return guess ? guess.replace(/[^a-z0-9]/gi, "") : "bin";
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

// Upload an avatar image (data URL) to the private bucket, return its path.
async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  dataUrl: string
): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl);
  const ext = mimeToExt(blob.type || "image/jpeg");
  const path = `${userId}/avatars/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("vault")
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

interface MediaRow {
  path: string;
  mime: string;
  filename?: string;
  duration?: number;
  kind: string;
}

// Turn a memory's attachment list into stored rows: newly-added items (data: URLs)
// are uploaded; already-saved items (with a path) are kept as-is.
async function buildMediaRows(
  supabase: SupabaseClient,
  userId: string,
  media: MediaItem[]
): Promise<MediaRow[]> {
  const rows: MediaRow[] = [];
  for (const m of media) {
    if (m.dataUrl?.startsWith("data:")) {
      const blob = await dataUrlToBlob(m.dataUrl);
      const ext = mimeToExt(m.mimeType);
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("vault")
        .upload(path, blob, { contentType: m.mimeType, upsert: false });
      if (error) throw error;
      rows.push({ path, mime: m.mimeType, filename: m.fileName, duration: m.durationSec, kind: m.kind });
    } else if (m.path) {
      rows.push({ path: m.path, mime: m.mimeType, filename: m.fileName, duration: m.durationSec, kind: m.kind });
    }
  }
  return rows;
}

// Map DB rows -> app types, attaching signed URLs for any media.
async function loadAll(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<VBTData> {
  const [profileRes, benRes, contentRes, msgRes, famRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("beneficiaries").select("*").eq("user_id", userId).order("created_at"),
    supabase
      .from("content_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("scheduled_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("family_members").select("*").eq("user_id", userId).order("created_at"),
  ]);

  const contentRows = contentRes.data ?? [];
  const benRows = benRes.data ?? [];
  const profileRow = profileRes.data;

  // A content row's attachments come from the `media` jsonb array; older rows
  // may only have the legacy single-media columns, which we fold into one item.
  const mediaOf = (c: {
    media?: { path: string; mime?: string; filename?: string; duration?: number; kind?: string }[] | null;
    media_path?: string | null;
    media_mime?: string | null;
    media_filename?: string | null;
    media_duration?: number | null;
  }): { path: string; mime: string; filename?: string; duration?: number; kind: string }[] => {
    const arr = Array.isArray(c.media) ? c.media : [];
    if (arr.length) {
      return arr.map((m) => ({
        path: m.path,
        mime: m.mime ?? "application/octet-stream",
        filename: m.filename ?? undefined,
        duration: m.duration ?? undefined,
        kind: m.kind ?? typeFromMime(m.mime ?? ""),
      }));
    }
    if (c.media_path) {
      return [
        {
          path: c.media_path,
          mime: c.media_mime ?? "application/octet-stream",
          filename: c.media_filename ?? undefined,
          duration: c.media_duration ?? undefined,
          kind: typeFromMime(c.media_mime ?? ""),
        },
      ];
    }
    return [];
  };

  // Collect every private-bucket path (all attachments + avatars) and sign once.
  const paths = [
    ...contentRows.flatMap((c) => mediaOf(c).map((m) => m.path)),
    ...benRows.filter((b) => b.avatar_path).map((b) => b.avatar_path as string),
    ...(profileRow?.avatar_path ? [profileRow.avatar_path as string] : []),
  ];
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data: sigs } = await supabase.storage.from("vault").createSignedUrls(paths, SIGNED_URL_TTL);
    sigs?.forEach((s, i) => {
      if (s.signedUrl) signed[paths[i]] = s.signedUrl;
    });
  }

  const profile: Profile | null = profileRow
    ? {
        id: userId,
        name: profileRow.name ?? "You",
        email,
        role: "creator",
        avatarUrl: profileRow.avatar_path ? signed[profileRow.avatar_path] : undefined,
        consentAt: profileRow.consent_at ?? undefined,
        createdAt: profileRow.created_at,
      }
    : null;

  return {
    profile,
    onboarded: Boolean(profileRow?.onboarded),
    beneficiaries: benRows.map((b) => ({
      id: b.id,
      name: b.name,
      relationship: b.relationship ?? "",
      email: b.email ?? undefined,
      birthday: b.birthday ?? undefined,
      notes: b.notes ?? undefined,
      avatarUrl: b.avatar_path ? signed[b.avatar_path] : undefined,
      createdAt: b.created_at,
    })),
    content: contentRows.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      note: c.note ?? undefined,
      transcript: c.transcript ?? undefined,
      tags: c.tags ?? [],
      beneficiaryIds: c.beneficiary_ids ?? [],
      promptId: c.prompt_id ?? undefined,
      aiConsent: c.ai_consent ?? true,
      createdAt: c.created_at,
      media: mediaOf(c).map((m) => ({
        dataUrl: signed[m.path] ?? "",
        mimeType: m.mime,
        kind: m.kind as ContentItem["type"],
        fileName: m.filename,
        durationSec: m.duration,
        path: m.path,
      })),
    })),
    messages: (msgRes.data ?? []).map((m) => ({
      id: m.id,
      contentId: m.content_id ?? undefined,
      title: m.title,
      note: m.note ?? undefined,
      beneficiaryId: m.beneficiary_id ?? "",
      trigger: m.trigger,
      releaseDate: m.release_date ?? undefined,
      milestone: m.milestone ?? undefined,
      status: m.status,
      createdAt: m.created_at,
    })),
    family: (famRes.data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      relationship: f.relationship ?? "",
      parentId: f.parent_id ?? undefined,
      partnerName: f.partner_name ?? undefined,
      birthYear: f.birth_year ?? undefined,
      deathYear: f.death_year ?? undefined,
      note: f.note ?? undefined,
      beneficiaryId: f.beneficiary_id ?? undefined,
      contentIds: f.content_ids ?? [],
      createdAt: f.created_at,
    })),
  };
}

interface StoreShape {
  data: VBTData;
  ready: boolean;
  configured: boolean;
  session: Session | null;
  refresh: () => Promise<void>;
  saveProfile: (name: string, avatarDataUrl?: string) => Promise<void>;
  recordConsent: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
  addBeneficiary: (
    b: Omit<Beneficiary, "id" | "createdAt" | "avatarUrl">,
    avatarDataUrl?: string
  ) => Promise<void>;
  updateBeneficiary: (
    id: string,
    patch: Partial<Omit<Beneficiary, "id" | "createdAt" | "avatarUrl">>,
    avatarDataUrl?: string
  ) => Promise<void>;
  removeBeneficiary: (id: string) => Promise<void>;
  addContent: (c: Omit<ContentItem, "id" | "createdAt">) => Promise<void>;
  updateContent: (
    id: string,
    patch: Partial<
      Pick<ContentItem, "title" | "note" | "tags" | "beneficiaryIds" | "aiConsent" | "media" | "type">
    >
  ) => Promise<void>;
  removeContent: (id: string) => Promise<void>;
  addMessage: (m: Omit<ScheduledMessage, "id" | "createdAt">) => Promise<void>;
  updateMessage: (id: string, patch: Partial<ScheduledMessage>) => Promise<void>;
  removeMessage: (id: string) => Promise<void>;
  addFamilyMember: (f: Omit<FamilyMember, "id" | "createdAt">) => Promise<void>;
  updateFamilyMember: (id: string, patch: Partial<FamilyMember>) => Promise<void>;
  removeFamilyMember: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => Promise<void>;
}

const StoreContext = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const configured = isSupabaseConfigured();
  const [data, setData] = useState<VBTData>(EMPTY);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const userId = session?.user.id ?? null;
  const emailRef = useRef<string>("");

  const refresh = async () => {
    if (!supabase || !userId) {
      setData(EMPTY);
      return;
    }
    const next = await loadAll(supabase, userId, emailRef.current);
    setData(next);
  };

  // Auth bootstrap + subscription
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      emailRef.current = session?.user.email ?? "";
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      emailRef.current = session?.user.email ?? "";
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data whenever the signed-in user changes
  useEffect(() => {
    if (!ready) return;
    if (userId) refresh();
    else setData(EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, ready]);

  const api: StoreShape = useMemo(() => {
    const requireAuth = () => {
      if (!supabase || !userId) throw new Error("Not signed in");
      return { supabase, userId };
    };
    return {
      data,
      ready,
      configured,
      session,
      refresh,
      saveProfile: async (name, avatarDataUrl) => {
        const { supabase, userId } = requireAuth();
        const row: Record<string, unknown> = { id: userId, name };
        if (avatarDataUrl?.startsWith("data:")) {
          row.avatar_path = await uploadAvatar(supabase, userId, avatarDataUrl);
        }
        const { error } = await supabase.from("profiles").upsert(row);
        if (error) throw error;
        await refresh();
      },
      recordConsent: async () => {
        const { supabase, userId } = requireAuth();
        await supabase.from("profiles").upsert({ id: userId, consent_at: new Date().toISOString() });
        await refresh();
      },
      finishOnboarding: async () => {
        const { supabase, userId } = requireAuth();
        await supabase.from("profiles").upsert({ id: userId, onboarded: true });
        await refresh();
      },
      addBeneficiary: async (b, avatarDataUrl) => {
        const { supabase, userId } = requireAuth();
        let avatar_path: string | null = null;
        if (avatarDataUrl?.startsWith("data:")) {
          avatar_path = await uploadAvatar(supabase, userId, avatarDataUrl);
        }
        const { error } = await supabase.from("beneficiaries").insert({
          user_id: userId,
          name: b.name,
          relationship: b.relationship,
          email: b.email ?? null,
          birthday: b.birthday ?? null,
          notes: b.notes ?? null,
          avatar_path,
        });
        if (error) throw error;
        await refresh();
      },
      updateBeneficiary: async (id, patch, avatarDataUrl) => {
        const { supabase, userId } = requireAuth();
        const row: Record<string, unknown> = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.relationship !== undefined) row.relationship = patch.relationship;
        if (patch.email !== undefined) row.email = patch.email ?? null;
        if (patch.birthday !== undefined) row.birthday = patch.birthday ?? null;
        if (patch.notes !== undefined) row.notes = patch.notes ?? null;
        if (avatarDataUrl?.startsWith("data:")) {
          row.avatar_path = await uploadAvatar(supabase, userId, avatarDataUrl);
        }
        const { error } = await supabase.from("beneficiaries").update(row).eq("id", id);
        if (error) throw error;
        await refresh();
      },
      removeBeneficiary: async (id) => {
        const { supabase } = requireAuth();
        await supabase.from("beneficiaries").delete().eq("id", id);
        await refresh();
      },
      addContent: async (c) => {
        const { supabase, userId } = requireAuth();
        const mediaRows = await buildMediaRows(supabase, userId, c.media ?? []);
        const { error } = await supabase.from("content_items").insert({
          user_id: userId,
          type: c.type,
          title: c.title,
          note: c.note ?? null,
          transcript: c.transcript ?? null,
          tags: c.tags,
          beneficiary_ids: c.beneficiaryIds,
          prompt_id: c.promptId ?? null,
          ai_consent: c.aiConsent ?? true,
          media: mediaRows,
        });
        if (error) throw error;
        await refresh();
      },
      updateContent: async (id, patch) => {
        const { supabase, userId } = requireAuth();
        const row: Record<string, unknown> = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.note !== undefined) row.note = patch.note ?? null;
        if (patch.tags !== undefined) row.tags = patch.tags;
        if (patch.beneficiaryIds !== undefined) row.beneficiary_ids = patch.beneficiaryIds;
        if (patch.aiConsent !== undefined) row.ai_consent = patch.aiConsent;
        if (patch.type !== undefined) row.type = patch.type;
        if (patch.media !== undefined) {
          row.media = await buildMediaRows(supabase, userId, patch.media);
        }
        await supabase.from("content_items").update(row).eq("id", id);
        await refresh();
      },
      removeContent: async (id) => {
        const { supabase } = requireAuth();
        const item = data.content.find((c) => c.id === id);
        await supabase.from("content_items").delete().eq("id", id);
        // best-effort media cleanup handled by cascade / lifecycle in production
        void item;
        await refresh();
      },
      addMessage: async (m) => {
        const { supabase, userId } = requireAuth();
        await supabase.from("scheduled_messages").insert({
          user_id: userId,
          content_id: m.contentId ?? null,
          title: m.title,
          note: m.note ?? null,
          beneficiary_id: m.beneficiaryId || null,
          trigger: m.trigger,
          release_date: m.releaseDate ?? null,
          milestone: m.milestone ?? null,
          status: m.status,
        });
        await refresh();
      },
      updateMessage: async (id, patch) => {
        const { supabase } = requireAuth();
        const row: Record<string, unknown> = {};
        if (patch.status !== undefined) row.status = patch.status;
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.note !== undefined) row.note = patch.note;
        await supabase.from("scheduled_messages").update(row).eq("id", id);
        await refresh();
      },
      removeMessage: async (id) => {
        const { supabase } = requireAuth();
        await supabase.from("scheduled_messages").delete().eq("id", id);
        await refresh();
      },
      addFamilyMember: async (f) => {
        const { supabase, userId } = requireAuth();
        await supabase.from("family_members").insert({
          user_id: userId,
          name: f.name,
          relationship: f.relationship,
          parent_id: f.parentId ?? null,
          partner_name: f.partnerName ?? null,
          birth_year: f.birthYear ?? null,
          death_year: f.deathYear ?? null,
          note: f.note ?? null,
          beneficiary_id: f.beneficiaryId ?? null,
          content_ids: f.contentIds ?? [],
        });
        await refresh();
      },
      updateFamilyMember: async (id, patch) => {
        const { supabase } = requireAuth();
        const row: Record<string, unknown> = {};
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.relationship !== undefined) row.relationship = patch.relationship;
        if (patch.parentId !== undefined) row.parent_id = patch.parentId ?? null;
        if (patch.partnerName !== undefined) row.partner_name = patch.partnerName ?? null;
        if (patch.birthYear !== undefined) row.birth_year = patch.birthYear ?? null;
        if (patch.deathYear !== undefined) row.death_year = patch.deathYear ?? null;
        if (patch.note !== undefined) row.note = patch.note ?? null;
        if (patch.beneficiaryId !== undefined) row.beneficiary_id = patch.beneficiaryId ?? null;
        if (patch.contentIds !== undefined) row.content_ids = patch.contentIds;
        await supabase.from("family_members").update(row).eq("id", id);
        await refresh();
      },
      removeFamilyMember: async (id) => {
        const { supabase } = requireAuth();
        // Detach children first so we don't orphan the tree via FK restriction.
        await supabase.from("family_members").update({ parent_id: null }).eq("parent_id", id);
        await supabase.from("family_members").delete().eq("id", id);
        await refresh();
      },
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
        setData(EMPTY);
      },
      reset: async () => {
        const { supabase, userId } = requireAuth();
        await Promise.all([
          supabase.from("scheduled_messages").delete().eq("user_id", userId),
          supabase.from("content_items").delete().eq("user_id", userId),
          supabase.from("beneficiaries").delete().eq("user_id", userId),
          supabase.from("family_members").delete().eq("user_id", userId),
        ]);
        await supabase.from("profiles").upsert({ id: userId, onboarded: false });
        await refresh();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ready, configured, session, userId]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
