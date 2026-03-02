import { launchAgent } from '../../lib/cursor-agent.js';
import { createDedupeStore } from '../../lib/dedupe-store.js';
import { getPromptFromJiraPayload } from '../../lib/jira-prompt.js';
import { detectTodoToInProgress } from '../../lib/jira-webhook.js';
import { verifyJiraSignature } from '../../lib/verify-jira-signature.js';

const dedupeStore = createDedupeStore();

/** Debounce Cursor agent launches per issue (Jira often sends two webhooks for one transition). */
const LAUNCH_DEBOUNCE_MS = 2 * 60 * 1000; // 2 min
const recentLaunches = new Map(); // issueKey -> timestamp

const WEBHOOK_ID_HEADER = 'x-atlassian-webhook-identifier';
const SIGNATURE_HEADER = 'x-hub-signature';

function wasRecentlyLaunched(issueKey) {
  const now = Date.now();
  for (const [key, ts] of recentLaunches.entries()) {
    if (now - ts > LAUNCH_DEBOUNCE_MS) recentLaunches.delete(key);
  }
  const last = recentLaunches.get(issueKey);
  if (last != null && now - last < LAUNCH_DEBOUNCE_MS) return true;
  recentLaunches.set(issueKey, now);
  return false;
}

/**
 * Jira Cloud webhook listener for task moved from To Do → In Progress.
 * - Verifies X-Hub-Signature when JIRA_WEBHOOK_SECRET is set.
 * - Deduplicates by X-Atlassian-Webhook-Identifier (retries get 200 without re-processing).
 * - Returns 200 so Jira does not retry.
 */
export async function jiraWebhook(request, reply) {
  const secret = process.env.JIRA_WEBHOOK_SECRET;
  if (secret) {
    const rawBody = request.rawBody;
    const signature = request.headers[SIGNATURE_HEADER];
    if (!rawBody || !verifyJiraSignature(secret, rawBody, signature)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  }

  const webhookId = request.headers[WEBHOOK_ID_HEADER];

  if (webhookId && dedupeStore.has(webhookId)) {
    return reply.code(200).send({ received: true, duplicate: true });
  }

  if (webhookId) dedupeStore.add(webhookId);

  const body = request.body ?? {};
  const transition = detectTodoToInProgress(body);

  if (transition.detected) {
    const ghRepoField = process.env.JIRA_GH_REPO_FIELD;
    const fields = body?.issue?.fields ?? {};

    if (!ghRepoField) {
      return reply.code(200).send({ received: true });
    }

    const repoValue = fields[ghRepoField];
    if (repoValue == null || repoValue === '') {
      return reply.code(200).send({ received: true });
    }

    const prompt = getPromptFromJiraPayload(body, {
      jiraBaseUrl: process.env.JIRA_BASE_URL,
      ghRepoField,
    });

    if (prompt && !wasRecentlyLaunched(prompt.issueKey)) {
      launchAgent({
        promptText: prompt.text,
        issueKey: prompt.issueKey,
        repo: prompt.repo,
      });
    }
  }

  return reply.code(200).send({ received: true });
}
