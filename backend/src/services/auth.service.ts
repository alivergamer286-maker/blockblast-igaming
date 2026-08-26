import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { config } from "../config";
import { AuthPayload } from "../middleware/auth";
import {
  issueVerifyToken,
  sendVerificationEmail,
  verifyEmailToken,
} from "./email.service";
import { attachReferral } from "./affiliate.service";

function publicUser(user: {
  id: string;
  email: string;
  username: string;
  balance: unknown;
  role?: string;
  status?: string;
  emailVerified?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    balance: Number(user.balance),
    role: user.role || "user",
    status: user.status || "active",
    emailVerified: Boolean(user.emailVerified),
  };
}

export async function register(
  email: string,
  username: string,
  password: string,
  referralCode?: string
) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: email.toLowerCase().trim() }, { username: username.trim() }],
    },
  });

  if (existing) {
    throw new Error("Email or username already taken");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      username: username.trim(),
      passwordHash,
      balance: config.initialBalance,
      role: "user",
      status: "active",
      emailVerified: false,
    },
  });

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "bonus",
      amount: config.initialBalance,
      balanceAfter: config.initialBalance,
      description: "Welcome bonus",
      reference: `welcome:${user.id}`,
    },
  });

  if (referralCode && referralCode.trim()) {
    try {
      await attachReferral(user.id, referralCode.trim());
    } catch (err) {
      console.warn("[auth] referral attach failed:", (err as Error).message);
    }
  }

  const verifyToken = await issueVerifyToken(user.id);
  try {
    await sendVerificationEmail(user.email, verifyToken);
  } catch (err) {
    console.error("[auth] verify email send failed:", (err as Error).message);
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return {
    token,
    user: publicUser(user),
    message: "Account created. Please verify your email.",
  };
}

export async function login(emailOrUsername: string, password: string) {
  const key = emailOrUsername.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: key.toLowerCase() }, { username: key }],
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  if (user.status === "banned") {
    throw new Error(
      user.banReason ? `Banned: ${user.banReason}` : "Account banned"
    );
  }

  if (user.status === "suspended") {
    throw new Error("Account suspended");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return {
    token,
    user: publicUser(user),
    emailVerified: user.emailVerified,
  };
}

export async function resendVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.emailVerified) throw new Error("Email already verified");

  const token = await issueVerifyToken(user.id);
  await sendVerificationEmail(user.email, token);
  return { message: "Verification email sent" };
}

export async function confirmEmail(token: string) {
  return verifyEmailToken(token);
}

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresInSec,
  });
}
