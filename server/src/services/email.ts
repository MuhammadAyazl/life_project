import { env } from '../config/env.js';

/**
 * Sends transactional email through Resend (https://resend.com) when RESEND_API_KEY is set.
 * Without a key (local development) the message is printed to the server console instead,
 * so password-reset links can still be tested. Returns false when it could not be delivered.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    if (env.isProd) {
      console.error('[email] RESEND_API_KEY is not set - email not sent.');
      return false;
    }
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}\n`);
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error('[email] Resend error', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.error('[email] send failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function passwordResetEmail(name: string, link: string) {
  const text = `Hi ${name},\n\nWe received a request to reset your ShopFussion password.\nOpen this link within 30 minutes to choose a new one:\n${link}\n\nIf you didn't ask for this, ignore this email - your password stays the same.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#14223d">
  <h2 style="margin:0 0 12px">Reset your password</h2>
  <p>Hi ${esc(name)},</p>
  <p>We received a request to reset your ShopFussion password. This link works for <b>30 minutes</b>:</p>
  <p style="margin:24px 0"><a href="${esc(link)}" style="background:#2f4a7a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p>
  <p style="color:#5b6b86;font-size:13px">If you didn't ask for this, ignore this email - your password stays the same.</p>
</div>`;
  return { subject: 'Reset your ShopFussion password', html, text };
}
