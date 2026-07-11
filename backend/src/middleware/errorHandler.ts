import { NextFunction, Request, Response } from 'express';

/** Error carrying an HTTP status code. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** 404 handler for unknown routes. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

/** Centralised error handler — keeps route code free of try/catch boilerplate. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({ error: message });
}

/** Wrap an async route handler so thrown/rejected errors reach errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
