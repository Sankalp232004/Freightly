import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';
import type { Pool } from 'pg';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  pool?: Pool;
}

export function extractToken(req: Request): string | undefined {
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return undefined;
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    return next();
  }
  try {
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret) as { userId: string; email: string; role: string };
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.userRole = payload.role;
  } catch {
    // Ignore invalid token for optional auth
  }
  next();
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    return next(createError('UNAUTHORIZED', 'Authentication required', 401));
  }
  try {
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret) as { userId: string; email: string; role: string };
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.userRole = payload.role;
    next();
  } catch {
    next(createError('UNAUTHORIZED', 'Invalid or expired session', 401));
  }
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  requireAuth(req, _res, (err) => {
    if (err) return next(err);
    if (req.userRole !== 'admin') {
      return next(createError('FORBIDDEN', 'Admin access required', 403));
    }
    next();
  });
}
