"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { MILESTONES } from "@/lib/prompts";
import {
  Card,
  PageHeader,
  Button,
  Field,
  Modal,
  StatusPill,
  EmptyState,
  inputClass,
} from "@/components/ui";
import { formatDate, TYPE_LABEL } from "@/lib/media";
import { TriggerType } from "@/lib/types";

export default function Messenger() {
  const { data, addMessage, updateMessage, removeMessage } = useStore();
  const [open, setOpen] = useState(false);

  // composer state
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [contentId, setContentId] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState(data.beneficiaries[0]?.id ?? "");
  const [trigger, setTrigger] = useState<TriggerType>("milestone");
  const [milestone, setMilestone] = useState(MILESTONES[0]);
  const [releaseDate, setReleaseDate] = useState("");

  const groups = useMemo(() => {
    const scheduled = data.messages.filter((m) => m.status === "scheduled");
    const drafts = data.messages.filter((m) => m.status === "draft");
    const delivered = data.messages.filter((m) => m.status === "delivered");
    return { scheduled, drafts, delivered };
  }, [data.messages]);

  const resetComposer = () => {
    setTitle("");
    setNote("");
    setContentId("");
    setBeneficiaryId(data.beneficiaries[0]?.id ?? "");
    setTrigger("milestone");
    setMilestone(MILESTONES[0]);
    setReleaseDate("");
  };

  const canSave =
    title.trim() &&
    beneficiaryId &&
    (trigger === "immediate" || (trigger === "date" ? releaseDate : milestone));

  const save = (status: "draft" | "scheduled") => {
    addMessage({
      title: title.trim(),
      note: note.trim() || undefined,
      contentId: contentId || undefined,
      beneficiaryId,
      trigger,
      milestone: trigger === "milestone" ? milestone : undefined,
      releaseDate: trigger === "date" ? releaseDate : undefined,
      status: trigger === "immediate" ? "delivered" : status,
    });
    resetComposer();
    setOpen(false);
  };

  const benName = (id: string) => data.beneficiaries.find((b) => b.id === id)?.name ?? "Your circle";

  const Section = ({
    label,
    items,
  }: {
    label: string;
    items: typeof data.messages;
  }) =>
    items.length ? (
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg text-ink">{label}</h2>
        <ul className="space-y-2.5">
          {items.map((m) => {
            const linked = data.content.find((c) => c.id === m.contentId);
            return (
              <li key={m.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg text-ink">{m.title}</h3>
                      <p className="mt-0.5 text-sm text-sage">
                        For {benName(m.beneficiaryId)} ·{" "}
                        {m.trigger === "date" && m.releaseDate
                          ? `Releases ${formatDate(m.releaseDate)}`
                          : m.trigger === "milestone"
                          ? `Milestone: ${m.milestone}`
                          : "Released immediately"}
                      </p>
                      {linked && (
                        <p className="mt-1 text-xs text-clay">
                          Attached: {TYPE_LABEL[linked.type]} — {linked.title}
                        </p>
                      )}
                      {m.note && <p className="mt-2 text-sm text-ink/70">{m.note}</p>}
                    </div>
                    <StatusPill status={m.status} />
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    {m.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => updateMessage(m.id, { status: "scheduled" })}>
                        Schedule
                      </Button>
                    )}
                    {m.status === "scheduled" && (
                      <Button size="sm" variant="ghost" onClick={() => updateMessage(m.id, { status: "delivered" })}>
                        Mark delivered
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => removeMessage(m.id)}>
                      Remove
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;

  const empty = data.messages.length === 0;

  return (
    <div>
      <PageHeader
        eyebrow="Messenger"
        title="Milestone messenger"
        subtitle="Tie a message to a date or a life milestone. It stays sealed until the moment arrives."
        action={
          <Button onClick={() => setOpen(true)} disabled={!data.beneficiaries.length}>
            Schedule a message
          </Button>
        }
      />

      {!data.beneficiaries.length && (
        <Card className="mb-6 p-4 text-sm text-sage">
          Add someone to your Legacy Circle first, so you have a person to send to.
        </Card>
      )}

      {empty ? (
        <EmptyState
          title="No messages scheduled"
          body="Schedule a birthday note, a graduation letter, or a message for a wedding years from now."
          action={
            data.beneficiaries.length ? (
              <Button onClick={() => setOpen(true)}>Schedule your first message</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Section label="Scheduled" items={groups.scheduled} />
          <Section label="Drafts" items={groups.drafts} />
          <Section label="Delivered" items={groups.delivered} />
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule a message" wide>
        <div className="space-y-5">
          <Field label="Message title">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. For your graduation day"
              autoFocus
            />
          </Field>

          <Field label="A short note (optional)">
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What should they know when this arrives?"
            />
          </Field>

          {data.content.length > 0 && (
            <Field label="Attach a memory from your vault (optional)">
              <select className={inputClass} value={contentId} onChange={(e) => setContentId(e.target.value)}>
                <option value="">None</option>
                {data.content.map((c) => (
                  <option key={c.id} value={c.id}>
                    {TYPE_LABEL[c.type]} — {c.title}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Send to">
            <select className={inputClass} value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)}>
              {data.beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.relationship})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Release when">
            <div className="mb-3 inline-flex rounded-full border border-ink/15 bg-parchment/60 p-1">
              {(["milestone", "date", "immediate"] as TriggerType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTrigger(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    trigger === t ? "bg-ink text-parchment" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {t === "immediate" ? "Right away" : t}
                </button>
              ))}
            </div>
            {trigger === "milestone" && (
              <select className={inputClass} value={milestone} onChange={(e) => setMilestone(e.target.value)}>
                {MILESTONES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            )}
            {trigger === "date" && (
              <input
                type="date"
                className={inputClass}
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            )}
            {trigger === "immediate" && (
              <p className="text-sm text-sage">This message will be marked delivered right away.</p>
            )}
          </Field>

          {beneficiaryId && (
            <p className="-mt-2 text-sm text-sage">
              This will go to{" "}
              <span className="font-medium text-ink">
                {data.beneficiaries.find((b) => b.id === beneficiaryId)?.name}
              </span>
              {(() => {
                const b = data.beneficiaries.find((x) => x.id === beneficiaryId);
                return b?.email ? ` (${b.email})` : " — no email on file yet, so they won't be notified.";
              })()}
              . Double-check "Send to" above if that's not right.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => save("draft")} disabled={!canSave}>
              Save as draft
            </Button>
            <Button onClick={() => save("scheduled")} disabled={!canSave}>
              {trigger === "immediate" ? "Send now" : "Schedule"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
