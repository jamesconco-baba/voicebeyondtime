# Amber auth email templates

Paste each file into **Supabase → Authentication → Email Templates**, into the matching
template's **Message body**, and set the **Subject** shown below.

Every file comes in two variants:
- `*-logo.html` — uses the hosted logo image (`https://theamberapp.com/amber-mark.png`).
  The image must be deployed and reachable first, and some email clients block remote
  images until the reader allows them.
- `*-dot.html` — uses a simple amber dot instead of the image. No hosting needed; always
  renders. Use this if the logo is blocked or looks broken.

Pick one variant per template (all logo, or all dot — keep it consistent).

| Supabase template      | File                        | Suggested subject                | Link type / lands on         |
|------------------------|-----------------------------|----------------------------------|------------------------------|
| Confirm signup         | `confirm-signup-*.html`     | Confirm your email for Amber     | `email` → `/onboarding`      |
| Invite user            | `invite-*.html`             | You're invited to Amber          | `invite` → `/onboarding`     |
| Magic Link             | `magic-link-*.html`         | Your Amber sign-in link          | `email` → `/dashboard` (+ OTP code) |
| Change Email Address   | `change-email-*.html`       | Confirm your new email for Amber | `email_change` → `/settings` |
| Reset Password         | `reset-password-*.html`     | Reset your Amber password        | `recovery` → `/reset-password` |
| Reauthentication       | `reauthentication-*.html`   | Your Amber verification code     | 6-digit code (no link)       |

Notes
- All link-based templates point at the `/auth/confirm` route, which verifies the token and
  starts the session. Keep the `{{ .SiteURL }}` and `{{ .TokenHash }}` variables intact.
- **Magic Link** shows both a one-click link and a one-time `{{ .Token }}` code (for OTP entry).
- **Reauthentication** shows only the `{{ .Token }}` code — it's used to reconfirm identity for
  sensitive actions and has no link.
- **Reset Password** lands on `/reset-password`, where the user sets a new password. The
  sign-in page has a "Forgot password?" trigger that sends this email.
- Make sure `/auth/confirm`, `/auth/callback`, and `/reset-password` (prod + localhost) are in
  Supabase → Authentication → URL Configuration → Redirect URLs.
