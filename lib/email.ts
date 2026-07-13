import "server-only";
import { Resend } from "resend";

const FROM = process.env.AMBER_EMAIL_FROM || "Amber <notify@theamberapp.com>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// A recipient's first message has arrived and they haven't claimed their spot yet.
export async function sendClaimInviteEmail(opts: {
  to: string;
  recipientName: string;
  creatorName: string;
  claimUrl: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping claim invite email to", opts.to);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.creatorName} left something for you on Amber`,
    html: `
      <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#20302E;">
        <p style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#A9573F;margin:0 0 12px;">Someone kept this for you</p>
        <p style="font-size:20px;line-height:1.4;margin:0 0 16px;">Hi ${escapeHtml(opts.recipientName)}, ${escapeHtml(
      opts.creatorName
    )} preserved a message for you through Amber.</p>
        <p style="font-size:15px;line-height:1.6;color:#20302E99;margin:0 0 24px;">To open it, we'll send a secure sign-in link to this email address — the one ${escapeHtml(
          opts.creatorName
        )} registered for you.</p>
        <a href="${opts.claimUrl}" style="display:inline-block;background:#20302E;color:#F7F1E6;padding:12px 24px;border-radius:10px;text-decoration:none;font-family:sans-serif;font-size:14px;">Open what was left for you</a>
      </div>
    `,
  });
}

// A subsequent message arrived for someone who's already claimed their account.
export async function sendNewMessageEmail(opts: { to: string; recipientName: string; creatorName: string; signInUrl: string }) {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping new-message email to", opts.to);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `A new message from ${opts.creatorName} is ready for you`,
    html: `
      <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#20302E;">
        <p style="font-size:20px;line-height:1.4;margin:0 0 16px;">Hi ${escapeHtml(opts.recipientName)}, another message from ${escapeHtml(
      opts.creatorName
    )} just became available.</p>
        <p style="font-size:15px;line-height:1.6;color:#20302E99;margin:0 0 24px;">We'll send a secure sign-in link to this email address to open it.</p>
        <a href="${opts.signInUrl}" style="display:inline-block;background:#20302E;color:#F7F1E6;padding:12px 24px;border-radius:10px;text-decoration:none;font-family:sans-serif;font-size:14px;">Sign in to view it</a>
      </div>
    `,
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
