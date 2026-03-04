import { logger } from './logger.js';

/**
 * Launch a Cursor Cloud Agent via the Cloud Agents API.
 * Uses CURSOR_API_KEY from env. Repository: ticket field gh_repo.
 * Fire-and-forget: does not throw.
 */

const CURSOR_AGENTS_URL = 'https://api.cursor.com/v0/agents';

/**
 * Launch a cloud agent with the given prompt. Does not await.
 * @param {object} options
 * @param {string} options.promptText - Instruction text for the agent
 * @param {string} [options.issueKey] - Jira issue key (used for branch name if provided)
 * @param {string} [options.repo] - Repository URL (e.g. from Jira ticket gh_repo);
 */
export function launchAgent({ promptText, issueKey, repo }) {
  const apiKey = process.env.CURSOR_API_KEY;

  if (!apiKey || !repo) return;
  const repository = repo;

  const branchName = issueKey ? `${issueKey}/cursor` : undefined;
  const secret = process.env.CURSOR_WEBHOOK_SECRET;
  const body = {
    prompt: { text: promptText },
    source: { repository, ref: 'main' },
    ...(branchName && {
      target: {
        branchName,
        autoCreatePr: true,
      },
      model: "claude-4-sonnet-thinking",
      webhook: {
        url:process.env.SERVER_HTTPS_ADDRESS + '/webhooks/cursor',
        secret,
      },
    }),
  };

  

  const auth = Buffer.from(`${apiKey}:`).toString('base64');

  logger.info({ body }, 'Cursor Agent Launch API body');

  if (process.env.NO_CURSOR_CALL) {
    logger.info('NO_CURSOR_CALL is set, skipping cursor agent');
    return;
  }

  logger.info('launching cursor agent');
  fetch(CURSOR_AGENTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  }).catch((e) => {
    logger.error({ e }, 'Error launching cursor agent: ', e.message);
  });
}
