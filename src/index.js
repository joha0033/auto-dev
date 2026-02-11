import 'dotenv/config';
import { Readable } from 'stream';
import Fastify from 'fastify';
import { jiraWebhook } from './routes/webhooks/jira.js';

const fastify = Fastify({ logger: true });

const JIRA_WEBHOOK_PATHS = ['/webhooks/jira', '/webooks/jira'];

fastify.addHook('preParsing', async (request, reply, payload) => {
  const path = request.url?.split('?')[0];
  if (request.method !== 'POST' || !JIRA_WEBHOOK_PATHS.includes(path)) return payload;
  const chunks = [];
  for await (const chunk of payload) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  request.rawBody = raw;
  return Readable.from(raw);
});

fastify.get('/', async () => ({ hello: 'world' }));

fastify.post('/webhooks/jira', jiraWebhook);
fastify.post('/webooks/jira', jiraWebhook);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
