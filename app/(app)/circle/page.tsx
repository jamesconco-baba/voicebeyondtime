"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { PageHeader, Button, Card, Field, Modal, EmptyState, inputClass } from "@/components/ui";
import { Avatar, AvatarPicker } from "@/components/avatar";
import { formatDate } from "@/lib/media";

const RELATIONSHIPS = ["Daughter", "Son", "Grandchild", "Spouse", "Sibling", "Other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Circle() {
  const { data, addBeneficiary } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !EMAIL_RE.test(email.trim())) return;
    setSaving(true);
    try {
      await addBeneficiary(
        {
          name: name.trim(),
          relationship,
          email: email.trim() || undefined,
          birthday: birthday || undefined,
        },
        avatar
      );
      setName("");
      setEmail("");
      setBirthday("");
      setAvatar(undefined);
      setRelationship(RELATIONSHIPS[0]);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const forCount = (id: string) =>
    data.content.filter((c) => c.beneficiaryIds.includes(id)).length +
    data.messages.filter((m) => m.beneficiaryId === id).length;

  return (
    <div>
      <PageHeader
        eyebrow="Legacy Circle"
        title="The people you're preserving for"
        subtitle="Your circle defines who can receive what you leave, and when. Tap anyone to add details."
        action={
          <div className="flex gap-2">
            <Link href="/inheritance">
              <Button variant="outline">Inheritance & release</Button>
            </Link>
            <Button onClick={() => setOpen(true)}>Add someone</Button>
          </div>
        }
      />

      {data.beneficiaries.length === 0 ? (
        <EmptyState
          title="Your circle is empty"
          body="Add a child, grandchild, or loved one so you can address messages to them and schedule releases."
          action={<Button onClick={() => setOpen(true)}>Add your first person</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.beneficiaries.map((b) => (
            <button
              key={b.id}
              onClick={() => router.push(`/circle/${b.id}`)}
              className="text-left"
            >
              <Card className="p-5 transition-shadow hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <Avatar url={b.avatarUrl} name={b.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg text-ink">{b.name}</h3>
                    <p className="text-sm text-sage">{b.relationship}</p>
                  </div>
                  <span className="text-sm text-clay">Edit →</span>
                </div>
                <dl className="mt-4 space-y-1 text-sm text-sage">
                  {b.email && <div className="truncate">Email · {b.email}</div>}
                  {b.birthday && <div>Birthday · {formatDate(b.birthday)}</div>}
                  <div>{forCount(b.id)} item(s) addressed to them</div>
                </dl>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add to your circle">
        <div className="space-y-5">
          <AvatarPicker
            name={name}
            preview={avatar}
            onPick={setAvatar}
            onClear={() => setAvatar(undefined)}
          />
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Their full name"
              autoFocus
            />
          </Field>
          <Field label="Relationship">
            <select className={inputClass} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
              {RELATIONSHIPS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Email" hint="This is where release notifications and sign-in links are sent — required for messages to reach them.">
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="them@example.com"
            />
          </Field>
          <Field label="Date of birth (optional)" hint="Helps suggest milestone dates later.">
            <input
              className={inputClass}
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!name.trim() || !EMAIL_RE.test(email.trim()) || saving}>
              {saving ? "Adding…" : "Add to circle"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
