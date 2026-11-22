import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export interface AuthenticatedRequest extends Request {
  uid?: string;
  userEmail?: string;
}

export type VerifyTokenFn = (
  idToken: string
) => Promise<{ uid: string; email?: string; email_verified?: boolean }>;

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const createRequireAuth = (verifyToken: VerifyTokenFn) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(401, 'Missing or invalid Authorization header.');
      }
      const token = authHeader.slice('Bearer '.length).trim();
      if (!token) {
        throw new AppError(401, 'Empty bearer token.');
      }

      const decoded = await verifyToken(token);
      if (decoded.email_verified !== true) {
        throw new AppError(403, 'Verified email address is required.');
      }

      req.uid = decoded.uid;
      req.userEmail = decoded.email;
      next();
    } catch (err) {
      if (err instanceof AppError) {
        next(err);
        return;
      }
      next(new AppError(401, 'Invalid or expired authentication token.'));
    }
  };
};

export const validateBody = <T extends ZodTypeAny>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new AppError(400, 'Invalid request payload.', {
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        })
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  void _next;
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Internal server error.';
  res.status(500).json({ error: message });
};
