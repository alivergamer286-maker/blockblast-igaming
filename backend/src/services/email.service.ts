import crypto from "crypto";
import { prisma } from "../utils/prisma";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function createRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function issueVerifyToken(userId: string): Promise<string> {
  const token = createRawToken();
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);

  // invalidate previous unused verify tokens
  await prisma.emailToken.updateMany({
    where: { userId, type: "verify", usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.emailToken.create({
    data: {
      userId,
      token,
      type: "verify",
      expiresAt,
    },
  });

  return token;
}

export function buildVerifyUrl(token: string): string {
  const front = (process.env.APP_URL || process.env.CORS_ORIGIN || "http://localhost:5173").replace(
    /\/$/,
    ""
  );
  return `${front}/verify-email?token=${token}`;
}

/**
 * Sends verification email via Resend when RESEND_API_KEY is set.
 * Otherwise logs the link (dev / until SMTP configured).
 */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = buildVerifyUrl(token);
  const subject = "Confirme seu e-mail — Block Blast";
  const html = `
    <p>Olá,</p>
    <p>Clique no link para confirmar seu e-mail:</p>
    <p><a href="${url}">${url}</a></p>
    <p>O link expira em 24 horas.</p>
    <p>Se você não criou conta, ignore este e-mail.</p>
  `;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Block Blast <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("[email] RESEND_API_KEY not set — verification link:", url);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[email] Resend error:", res.status, body);
    throw new Error("Failed to send verification email");
  }
}

export async function verifyEmailToken(token: string): Promise<{ email: string }> {
  const row = await prisma.emailToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!row || row.type !== "verify") {
    throw new Error("Invalid token");
  }
  if (row.usedAt) {
    throw new Error("Token already used");
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new Error("Token expired");
  }

  await prisma.$transaction([
    prisma.emailToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: true },
    }),
  ]);

  return { email: row.user.email };
}
