/**
 * POST /api/contact — formulario de contacto → email vía Resend.
 * Variables (Cloudflare Pages → Settings → Environment variables):
 *   RESEND_API_KEY   clave de Resend
 *   RESEND_FROM      remitente verificado, p.ej. "Emili Godes <no-reply@godes.org>"
 *   CONTACT_TO       destinatario (tu buzón)
 *   TURNSTILE_SECRET (opcional) clave secreta de Cloudflare Turnstile; si falta, no se verifica
 * Admite un adjunto (imagen o PDF, máx. 10 MB) que se reenvía como attachment de Resend.
 */
interface Env {
  RESEND_API_KEY: string;
  RESEND_FROM?: string;
  CONTACT_TO: string;
  TURNSTILE_SECRET?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let fd: FormData;
  try { fd = await request.formData(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }
  const get = (k: string) => String(fd.get(k) || '').trim();
  const name = get('name'), email = get('email'), message = get('message'), lang = get('lang') || 'es';

  if (get('website')) return json({ ok: true }); // honeypot: fingimos éxito
  if (!name || !email || !message || name.length > 120 || email.length > 200 || message.length > 5000) return json({ ok: false, error: 'invalid' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'invalid_email' }, 400);
  if (!fd.get('consent')) return json({ ok: false, error: 'consent' }, 400);

  // Adjunto opcional: imagen o PDF, máx. 10 MB (Resend admite hasta 40 MB por email)
  const MAX_FILE = 10 * 1024 * 1024;
  const file = fd.get('file');
  let attachment: { filename: string; content: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE) return json({ ok: false, error: 'file_too_big' }, 413);
    const okType = file.type.startsWith('image/') || file.type === 'application/pdf' || /\.(jpe?g|png|gif|webp|tiff?|heic|pdf)$/i.test(file.name);
    if (!okType) return json({ ok: false, error: 'file_type' }, 415);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    attachment = { filename: file.name.replace(/[^\w.\-() ]+/g, '_').slice(0, 120), content: btoa(bin) };
  }

  if (env.TURNSTILE_SECRET) {
    const token = get('cf-turnstile-response');
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
    }).then((r) => r.json() as Promise<{ success: boolean }>).catch(() => ({ success: false }));
    if (!v.success) return json({ ok: false, error: 'turnstile' }, 403);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) return json({ ok: false, error: 'not_configured' }, 500);
  const ip = request.headers.get('CF-Connecting-IP') || '-';
  const ua = request.headers.get('User-Agent') || '-';
  const html = `<p><strong>Nombre:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(email)}<br><strong>Idioma:</strong> ${esc(lang)}</p>
    <p style="white-space:pre-wrap">${esc(message)}</p>${attachment ? `<p><strong>Adjunto:</strong> ${esc(attachment.filename)}</p>` : ''}<hr><p style="color:#888;font-size:12px">IP ${esc(ip)} · ${esc(ua)}</p>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'User-Agent': 'emili-godes-contact/1.0' },
    body: JSON.stringify({
      from: env.RESEND_FROM || 'Emili Godes <onboarding@resend.dev>',
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `[emili.godes.org] Mensaje de ${name}`,
      html,
      text: `Nombre: ${name}\nEmail: ${email}\nIdioma: ${lang}\n\n${message}`,
      ...(attachment ? { attachments: [attachment] } : {}),
    }),
  });
  if (!r.ok) return json({ ok: false, error: 'send_failed' }, 502);
  return json({ ok: true });
};
