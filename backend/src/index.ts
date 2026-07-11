import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.port, () => {
  console.log(`[groweasy] backend listening on http://localhost:${env.port}`);
  console.log(`[groweasy] AI provider: ${env.aiProvider} | batch size: ${env.batchSize}`);
});
