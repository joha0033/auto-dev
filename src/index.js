import 'dotenv/config';
import { Readable } from 'stream';
import Fastify from 'fastify';
import { logger } from './lib/logger.js';
import { jiraWebhook } from './routes/webhooks/jira.js';

const fastify = Fastify({ logger: false });

fastify.addHook('preParsing', async (request, reply, payload) => {
  const path = request.url?.split('?')[0];
  if (request.method !== 'POST' || path !== '/webhooks/jira') return payload;
  const chunks = [];
  for await (const chunk of payload) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  request.rawBody = raw;
  return Readable.from(raw);
});

fastify.get('/', async () => ({ hello: 'world' }));

fastify.get('/health', async () => ({ status: 'ok' }));

fastify.post('/webhooks/jira', jiraWebhook);
const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info({ port }, 'Server listening');
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

start();
