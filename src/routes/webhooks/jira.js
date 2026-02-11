import { launchAgent } from '../../lib/cursor-agent.js';
import { createDedupeStore } from '../../lib/dedupe-store.js';
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
 * - Logs "DO IT!" only when a task is moved from To Do to In Progress.
 * - Returns 200 so Jira does not retry.
 */
export async function jiraWebhook(request, reply) {
  const secret = process.env.JIRA_WEBHOOK_SECRET;
  if (secret) {
    const rawBody = request.rawBody;
    const signature = request.headers[SIGNATURE_HEADER];
    if (!rawBody || !verifyJiraSignature(secret, rawBody, signature)) {
      request.log.warn('jira webhook signature missing or invalid');
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  }

  const webhookId = request.headers[WEBHOOK_ID_HEADER];

  if (webhookId && dedupeStore.has(webhookId)) {
    request.log.info({ webhookId }, 'jira webhook duplicate (deduplicated)');
    return reply.code(200).send({ received: true, duplicate: true });
  }

  if (webhookId) dedupeStore.add(webhookId);

  const body = request.body ?? {};
  const transition = detectTodoToInProgress(body);

  if (transition.detected) {
    request.log.info(
      { issueKey: transition.issueKey, from: transition.from, to: transition.to },
      'DO IT!'
    );
    const prompt = getPromptFromJiraPayload(body, {
      jiraBaseUrl: process.env.JIRA_BASE_URL,
      ghRepoField: process.env.JIRA_GH_REPO_FIELD || 'gh_repo',
    });
    if (prompt) {
      launchAgent({
        promptText: prompt.text,
        issueKey: prompt.issueKey,
        repo: prompt.repo,
        log: request.log.bind(request),
      });
    } else {
      request.log.info(
        { issueKey: transition.issueKey },
        'cursor agent skipped: no summary or description in payload'
      );
    }
  }

  return reply.code(200).send({ received: true });
}
