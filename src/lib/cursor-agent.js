/**
 * Launch a Cursor Cloud Agent via the Cloud Agents API.
 * Uses CURSOR_API_KEY and CURSOR_REF from env. Repository: ticket field gh_repo, else CURSOR_REPO.
 * Fire-and-forget: does not throw.
 */

const CURSOR_AGENTS_URL = 'https://api.cursor.com/v0/agents';

/**
 * Launch a cloud agent with the given prompt. Does not await.
 * @param {object} options
 * @param {string} options.promptText - Instruction text for the agent
 * @param {string} [options.issueKey] - Jira issue key (used for branch name if provided)
 * @param {string} [options.repo] - Repository URL (e.g. from Jira ticket gh_repo); overrides CURSOR_REPO
 */
export function launchAgent({ promptText, issueKey, repo }) {
  const apiKey = process.env.CURSOR_API_KEY;
  const repository = repo ?? process.env.CURSOR_REPO;
  const ref = process.env.CURSOR_REF ?? 'main';

  if (!apiKey || !repository) return;

  const branchName = issueKey ? `${issueKey}/cursor` : undefined;

  const body = {
    prompt: { text: promptText },
    source: { repository, ref },
    ...(branchName && {
      target: {
        branchName,
        autoCreatePr: true,
      },
    }),
  };

  if (process.env.NO_CURSOR_CALL) return;

  const auth = Buffer.from(`${apiKey}:`).toString('base64');

  logger.info({ body }, 'launchAgent');
  fetch(CURSOR_AGENTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  }).catch(() => {});
}
