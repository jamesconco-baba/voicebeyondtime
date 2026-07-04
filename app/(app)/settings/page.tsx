"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageHeader, Card, Button, Field, Modal, inputClass } from "@/components/ui";
import { AvatarPicker } from "@/components/avatar";

export default function Settings() {
  const { data, saveProfile, reset, signOut } = useStore();
  const router = useRouter();
  const [name, setName] = useState(data.profile?.name ?? "");
  const [email] = useState(data.profile?.email ?? "");
  const [avatar, setAvatar] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirm, setConfirm] = useState(false);

  const saveProfileChanges = async () => {
    if (!data.profile) return;
    setSavingProfile(true);
    setSaveError("");
    try {
      await saveProfile(name.trim() || data.profile.name, avatar);
      setAvatar(undefined);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Couldn't save your profile. Please try again."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const doReset = async () => {
    await reset();
    setConfirm(false);
    router.push("/dashboard");
  };

  const doSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Account & privacy" />

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 font-display text-lg text-ink">Your profile</h2>
          <div className="mb-5">
            <AvatarPicker
              url={data.profile?.avatarUrl}
              preview={avatar}
              name={name}
              onPick={setAvatar}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email" hint="Managed by your account.">
              <input className={`${inputClass} opacity-70`} type="email" value={email} readOnly />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={saveProfileChanges} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
            {saved && <span className="text-sm text-sage">Saved</span>}
            <span className="flex-1" />
            <Button variant="outline" onClick={doSignOut}>
              Sign out
            </Button>
          </div>
          {saveError && <p className="mt-3 text-sm text-clay">{saveError}</p>}
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 font-display text-lg text-ink">How your data is stored</h2>
          <p className="text-[15px] leading-relaxed text-ink/70">
            Your account, memories, and scheduled messages live in your Supabase project.
            Media files are kept in a private storage bucket, and row-level security means
            each account can only ever read or write its own content.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="mb-1 font-display text-lg text-ink">New here, or need a hand?</h2>
              <p className="text-[15px] leading-relaxed text-ink/70">
                The How to Use guide walks through everything — recording, scheduling
                messages, your Legacy Circle, inheritance, and the AI features.
              </p>
            </div>
            <Link href="/guide">
              <Button variant="outline">Open the guide</Button>
            </Link>
          </div>
        </Card>

        <Card className="border-clay/30 p-6">
          <h2 className="mb-2 font-display text-lg text-ink">Clear my content</h2>
          <p className="mb-4 text-[15px] text-ink/70">
            Permanently deletes your circle, vault, and scheduled messages from your
            account. Your login stays, but everything you&apos;ve preserved is removed. This
            can&apos;t be undone.
          </p>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Clear all content
          </Button>
        </Card>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Clear all content?">
        <p className="text-[15px] text-ink/70">
          This removes everything you&apos;ve preserved and takes you back to the start.
          There&apos;s no way to recover it.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            Keep my data
          </Button>
          <Button variant="danger" onClick={doReset}>
            Yes, clear everything
          </Button>
        </div>
      </Modal>
    </div>
  );
}
