import express, { Application, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { env } from './config/env';
import { importRouter } from './routes/import';
import { errorHandler, notFound } from './middleware/errorHandler';

/**
 * Build a CORS origin checker that tolerates common misconfigurations:
 * - "*" (or empty) allows any origin.
 * - A comma-separated allowlist is supported.
 * - Entries match with or without the URL scheme / trailing slash, so both
 *   "example.com" and "https://example.com" authorise https://example.com.
 * When allowed, the request's exact Origin (including scheme) is reflected
 * back in Access-Control-Allow-Origin, which is what browsers require.
 */
function buildCorsOrigin(setting: string): CorsOptions['origin'] {
  if (!setting || setting.trim() === '*') return true;
  const normalize = (v: string) =>
    v.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
  const allow = new Set(setting.split(',').map(normalize).filter(Boolean));
  return (origin, callback) => {
    // Non-browser clients (curl, server-to-server) send no Origin header.
    if (!origin) return callback(null, true);
    callback(null, allow.has(normalize(origin)));
  };
}

/** Build and configure the Express application (kept separate from listen()
 *  so it can be imported directly in tests). */
export function createApp(): Application {
  const app = express();

  app.use(cors({ origin: buildCorsOrigin(env.corsOrigin) }));
  app.use(express.json({ limit: `${env.maxUploadMb}mb` }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      provider: env.aiProvider,
      batchSize: env.batchSize,
      maxRetries: env.maxRetries,
    });
  });

  app.use('/api', importRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
