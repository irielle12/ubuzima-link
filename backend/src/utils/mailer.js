const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP is not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS) — admin/clinician 2FA codes can't be emailed without it."
    );
  }

  const port = Number(SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // most providers (587/25) use STARTTLS instead of implicit TLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

async function sendOtpEmail(to, code) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await getTransporter().sendMail({
    from,
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
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await getTransporter().sendMail({
    from,
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
