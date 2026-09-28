import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../lib/logger.js';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function createError(code: string, message: string, statusCode = 500): ApiError {
  const err: ApiError = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

// Consistent error response shape — never a bare 500
export function errorHandler(
  err: ApiError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        fields: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  const statusCode = (err as ApiError).statusCode ?? 500;
  const code = (err as ApiError).code ?? 'INTERNAL_ERROR';

  if (statusCode >= 500) {
    logger.error({ err }, 'Unhandled server error');
  }

  res.status(statusCode).json({
    error: {
      code,
      message: statusCode >= 500 ? 'An unexpected error occurred' : err.message,
    },
  });
}
