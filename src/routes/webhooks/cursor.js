import { logger } from '../../lib/logger.js';
import { verifyCursorSignature } from '../../lib/verify-cursor-signature.js';

const SIGNATURE_HEADER = 'x-webhook-signature';
const WEBHOOK_ID_HEADER = 'x-webhook-id';

export async function cursorWebhook(request, reply) {
  const webhookId = request.headers[WEBHOOK_ID_HEADER];
  const event = request.headers['x-webhook-event'];

  logger.info({ webhookId, event, body: request.body }, 'cursorWebhook received');

  const secret = process.env.CURSOR_WEBHOOK_SECRET;
  if (secret) {
    const rawBody = request.rawBody;
    const signature = request.headers[SIGNATURE_HEADER];
    if (!rawBody || !verifyCursorSignature(secret, rawBody, signature)) {
      logger.warn({ webhookId }, 'cursorWebhook signature verification failed');
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    logger.info({ webhookId, event }, 'Cursor Webhook verified');
  }

  return reply.code(200).send({ received: true });
} 
