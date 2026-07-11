import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { importRouter } from './routes/import';
import { errorHandler, notFound } from './middleware/errorHandler';

/** Build and configure the Express application (kept separate from listen()
 *  so it can be imported directly in tests). */
export function createApp(): Application {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
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
