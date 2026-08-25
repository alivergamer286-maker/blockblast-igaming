import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { config } from "../config";
import { AuthPayload } from "../middleware/auth";

function publicUser(user: {
  id: string;
  email: string;
  username: string;
  balance: unknown;
  role?: string;
  status?: string;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    balance: Number(user.balance),
    role: user.role || "user",
    status: user.status || "active",
  };
}

export async function register(
  email: string,
  username: string,
  password: string
) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
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

  const token = signToken({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  return { token, user: publicUser(user) };
}

export async function login(emailOrUsername: string, password: string) {
  const key = emailOrUsername.trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: key.toLowerCase() },
        { username: key },
      ],
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

  return { token, user: publicUser(user) };
}

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresInSec,
  });
}
