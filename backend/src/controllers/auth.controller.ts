import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(
      data.email,
      data.username,
      data.password
    );
    res.status(201).json(result);
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(400).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.emailOrUsername, data.password);
    res.json(result);
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({ error: err.errors });
      return;
    }
    res.status(401).json({ error: err.message });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const token = String(req.query.token || req.body?.token || "");
    if (!token) {
      res.status(400).json({ error: "Token required" });
      return;
    }
    const result = await authService.confirmEmail(token);
    res.json({ ok: true, email: result.email, message: "Email verified" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function resendVerify(req: Request, res: Response) {
  try {
    const result = await authService.resendVerification(req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
