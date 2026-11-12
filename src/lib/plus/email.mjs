import { Resend } from 'resend';
import { HttpError, canonicalOrigin } from './http.mjs';

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new HttpError(503, 'Email is not configured. Set RESEND_API_KEY.');
  return new Resend(key);
}

function fromAddress() {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new HttpError(503, 'EMAIL_FROM is not configured.');
  return from;
}

export async function sendEmail({ to, subject, html, text, idempotencyKey, headers }) {
  const { data, error } = await client().emails.send(
    { from: fromAddress(), to, subject, html, text, headers },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  if (error) throw new HttpError(502, 'The email could not be sent.');
  return data;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function sendMagicLink({ email, token }) {
  const url = `${canonicalOrigin()}/api/auth/verify?token=${encodeURIComponent(token)}`;
  const html = `<p>Sign in to Waterfalls Near You.</p><p><a href="${escapeHtml(url)}">Sign in</a></p><p>This link works once and expires in 30 minutes. If you did not ask for it, you can ignore this email.</p>`;
  const text = `Sign in to Waterfalls Near You:\n${url}\n\nThis link works once and expires in 30 minutes.`;
  await sendEmail({
    to: email,
    subject: 'Your Waterfalls Near You sign-in link',
    html,
    text,
    idempotencyKey: `magic/${token.slice(0, 24)}`,
  });
}

export async function sendAlertEmail({ email, unsubToken, items }) {
  const origin = canonicalOrigin();
  const unsub = `${origin}/api/alerts/unsubscribe?token=${encodeURIComponent(unsubToken)}`;
  const blocks = items.map((item) => {
    const link = `${origin}${item.url}`;
    const lines = item.signals.map((s) => `<li>${escapeHtml(s.summary)}</li>`).join('');
    return `<h2><a href="${escapeHtml(link)}">${escapeHtml(item.name)}</a></h2><ul>${lines}</ul>`;
  }).join('');
  const html = `<p>Conditions changed for waterfalls you are watching on Waterfalls Near You Plus.</p>${blocks}<p>These notes come from public weather and, when a gauge name matches, USGS data. They are not a promise that a waterfall is safe or at peak flow. Confirm locally before you go.</p><p><a href="${escapeHtml(unsub)}">Unsubscribe from condition alerts</a></p>`;
  const text = items.map((item) => `${item.name} (${origin}${item.url})\n${item.signals.map((s) => `- ${s.summary}`).join('\n')}`).join('\n\n')
    + `\n\nUnsubscribe: ${unsub}`;
  const day = new Date().toISOString().slice(0, 10);
  await sendEmail({
    to: email,
    subject: items.length === 1 ? `Conditions: ${items[0].name}` : `Conditions for ${items.length} waterfalls you watch`,
    html,
    text,
    headers: { 'List-Unsubscribe': `<${unsub}>` },
    idempotencyKey: `alerts/${email}/${day}`,
  });
}
