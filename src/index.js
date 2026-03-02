import 'dotenv/config';
import Fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import { logger } from './lib/logger.js';
import { jiraWebhook } from './routes/webhooks/jira.js';

const fastify = Fastify({ logger: false });

await fastify.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
  encoding: false,
  routes: ['/webhooks/jira'],
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
