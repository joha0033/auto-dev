import 'dotenv/config';
import { Readable } from 'stream';
import Fastify from 'fastify';
import { jiraWebhook } from './routes/webhooks/jira.js';

const isProduction = process.env.NODE_ENV === 'production';

const loggerConfig = isProduction
  ? true
  : {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    };

const fastify = Fastify({ logger: loggerConfig });

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

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
