import { launchAgent } from '../../lib/cursor-agent.js';
import { createDedupeStore } from '../../lib/dedupe-store.js';
import { logger } from '../../lib/logger.js';
import { getPromptFromJiraPayload } from '../../lib/jira-prompt.js';
import { detectTodoToInProgress } from '../../lib/jira-webhook.js';
import { verifyJiraSignature } from '../../lib/verify-jira-signature.js';


const dedupeStore = createDedupeStore();

const WEBHOOK_ID_HEADER = 'x-atlassian-webhook-identifier';
const SIGNATURE_HEADER = 'x-hub-signature';

/**
 * Jira Cloud webhook listener for task moved from To Do → In Progress.
 * - Verifies X-Hub-Signature when JIRA_WEBHOOK_SECRET is set.
 * - Deduplicates by X-Atlassian-Webhook-Identifier (retries get 200 without re-processing).
 * - Returns 200 so Jira does not retry.
 */
export async function jiraWebhook(request, reply) {
  const webhookId = request.headers[WEBHOOK_ID_HEADER];
  logger.info(
    { webhookId, webhookEvent: request.body?.webhookEvent, issueKey: request.body?.issue?.key },
    'jiraWebhook received'
  );

  try {
    const secret = process.env.JIRA_WEBHOOK_SECRET;
    if (secret) {
      const rawBody = request.rawBody;
      const signature = request.headers[SIGNATURE_HEADER];
      if (!rawBody || !verifyJiraSignature(secret, rawBody, signature)) {
        logger.warn({ webhookId }, 'jiraWebhook signature verification failed');
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }

    if (webhookId && dedupeStore.has(webhookId)) {
      logger.debug({ webhookId }, 'jiraWebhook duplicate, skipping');
      return reply.code(200).send({ received: true, duplicate: true });
    }

    if (webhookId) dedupeStore.add(webhookId);

    const body = request.body ?? {};
    const transition = detectTodoToInProgress(body);

    if (transition.detected) {
      const ghRepoField = process.env.JIRA_GH_REPO_FIELD;
      const fields = body?.issue?.fields ?? {};

      const repoValue = fields[ghRepoField];
      if (repoValue == null || repoValue === '') {
        logger.debug({ webhookId, ghRepoField }, 'jiraWebhook repo field empty, skipping agent');
        return reply.code(200).send({ received: true });
      }

      const prompt = getPromptFromJiraPayload(body, {
        jiraBaseUrl: process.env.JIRA_BASE_URL,
        ghRepoField,
      });

      logger.info({ prompt, webhookId }, 'jiraWebhook prompt built');

      if (prompt) {
        launchAgent({
          promptText: prompt.text,
          issueKey: prompt.issueKey,
          repo: prompt.repo,
        });
      }
    }

    return reply.code(200).send({ received: true });
  } catch (err) {
    logger.error(
      { err, message: err?.message, stack: err?.stack, webhookId, body: request.body },
      'jiraWebhook error'
    );
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
}
