/**
 * Ariadne Works — Cloudflare Worker
 *
 * Routes:
 *   POST /contact  — verify Turnstile, forward form data via email
 *   *              — serve static assets from the project directory
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/contact") {
      return handleContact(request, env);
    }

    // Serve static assets (index.html, assets/*, etc.)
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let body;
  try {
    body = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid form data" }, 400);
  }

  const name    = (body.get("name")    || "").trim();
  const company = (body.get("company") || "").trim();
  const email   = (body.get("email")   || "").trim();
  const message = (body.get("message") || "").trim();
  const token   = body.get("cf-turnstile-response") || "";

  if (!name || !company || !email || !message) {
    return jsonResponse({ ok: false, error: "All fields are required." }, 400);
  }

  // ── Verify Turnstile ──────────────────────────────────────────────────────
  const tsResult = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, request);
  if (!tsResult.success) {
    return jsonResponse({ ok: false, error: "Captcha verification failed. Please try again." }, 403);
  }

  // ── Send email via MailChannels ───────────────────────────────────────────
  const emailRes = await sendEmail({
    to:      env.TO_EMAIL || "mike@ariadneworks.com",
    from:    "noreply@ariadneworks.com",
    replyTo: email,
    subject: `New enquiry from ${name} (${company})`,
    text: `Name: ${name}\nCompany: ${company}\nEmail: ${email}\n\n${message}`,
    html: `<p><strong>Name:</strong> ${escHtml(name)}</p>
<p><strong>Company:</strong> ${escHtml(company)}</p>
<p><strong>Email:</strong> ${escHtml(email)}</p>
<hr/>
<p>${escHtml(message).replace(/\n/g, "<br>")}</p>`,
  });

  if (!emailRes.ok) {
    const detail = await emailRes.text();
    console.error("MailChannels error:", emailRes.status, detail);
    return jsonResponse({ ok: false, error: "Failed to send message. Please try again later." }, 502);
  }

  return jsonResponse({ ok: true, message: "Thanks! We'll be in touch shortly." });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function verifyTurnstile(token, secret, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  return res.json();
}

async function sendEmail({ to, from, replyTo, subject, text, html }) {
  return fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: "Ariadne Works" },
      reply_to: { email: replyTo },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html",  value: html },
      ],
    }),
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
