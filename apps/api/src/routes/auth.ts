import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Pool } from 'pg';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { createError } from '../middleware/errorHandler.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many auth attempts; try again in 15 minutes' } },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts; try again in 15 minutes' } },
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function issueToken(userId: string, email: string, role: string, res: Response): string {
  const secret = process.env.JWT_SECRET!;
  const token = jwt.sign({ userId, email, role }, secret, { expiresIn: '30d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}

authRouter.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = RegisterSchema.parse(req.body);
    const pool = (req as any).pool as Pool;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return next(createError('EMAIL_IN_USE', 'An account with this email already exists', 409));
    }

    const passwordHash = await argon2.hash(password);
    const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.toLowerCase().trim() : '';
    const role = email.toLowerCase().trim() === adminEmail ? 'admin' : 'user';

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role`,
      [email, passwordHash, role],
    );
    const user = rows[0];
    const token = issueToken(user.id, user.email, user.role, res);

    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const pool = (req as any).pool as Pool;

    const { rows } = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email],
    );
    const user = rows[0];
    if (!user) return next(createError('INVALID_CREDENTIALS', 'Invalid email or password', 401));

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) return next(createError('INVALID_CREDENTIALS', 'Invalid email or password', 401));

    const token = issueToken(user.id, user.email, user.role, res);
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = (req as any).pool as Pool;
    const { rows } = await pool.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [req.userId]);
    if (!rows[0]) return next(createError('NOT_FOUND', 'User not found', 404));
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});
