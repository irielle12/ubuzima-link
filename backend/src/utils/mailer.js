// Sends over Resend's HTTPS API rather than raw SMTP. Render (and most
// PaaS hosts) blocks outbound SMTP ports (25/465/587) for anti-spam
// reasons — that's invisible locally (nothing blocks it on a dev machine)
// but reliably times out in production, which is exactly what happened
// here. An HTTP API on port 443 has no such restriction.
async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured — admin/doctor 2FA and password-reset codes can't be emailed without it."
    );
  }

  const from = process.env.EMAIL_FROM || "Ubuzima-Link <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

async function sendOtpEmail(to, code) {
  await sendEmail({
    to,
    subject: `Your Ubuzima-Link verification code: ${code}`,
    text: `Your Ubuzima-Link sign-in verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <p>Your Ubuzima-Link sign-in verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0;">${code}</p>
      <p style="color:#64748b;font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

async function sendPasswordResetEmail(to, code) {
  await sendEmail({
    to,
    subject: `Your Ubuzima-Link password reset code: ${code}`,
    text: `Someone requested a password reset for your Ubuzima-Link account. Your reset code is ${code}. It expires in 15 minutes. If you didn't request this, you can ignore this email — your password won't change unless this code is used.`,
    html: `
      <p>Someone requested a password reset for your Ubuzima-Link account.</p>
      <p>Your reset code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0;">${code}</p>
      <p style="color:#64748b;font-size:13px;">This code expires in 15 minutes. If you didn't request this, you can safely ignore this email — your password won't change unless this code is used.</p>
    `,
  });
}

module.exports = { sendOtpEmail, sendPasswordResetEmail };
