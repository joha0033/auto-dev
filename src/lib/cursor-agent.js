/**
 * Launch a Cursor Cloud Agent via the Cloud Agents API.
 * Uses CURSOR_API_KEY and CURSOR_REF from env. Repository: ticket field gh_repo, else CURSOR_REPO.
 * Fire-and-forget: logs errors but does not throw.
 */

const CURSOR_AGENTS_URL = 'https://api.cursor.com/v0/agents';

/**
 * Launch a cloud agent with the given prompt. Does not await; logs and ignores errors.
 * @param {object} options
 * @param {string} options.promptText - Instruction text for the agent
 * @param {string} [options.issueKey] - Jira issue key (used for branch name if provided)
 * @param {string} [options.repo] - Repository URL (e.g. from Jira ticket gh_repo); overrides CURSOR_REPO
 * @param {(msgOrData: string|object, dataOrMsg?: object|string) => void} [options.log] - Logger; called as log(msg, data) or log(data, msg)
 */
export function launchAgent({ promptText, issueKey, repo, log = console }) {
  const apiKey = process.env.CURSOR_API_KEY;
  const repository = repo ?? process.env.CURSOR_REPO;
  const ref = process.env.CURSOR_REF ?? 'main';

  if (!apiKey || !repository) {
    const msg = 'cursor agent skipped: CURSOR_API_KEY and repo (gh_repo on ticket or CURSOR_REPO) are required';
    const data = { hasKey: Boolean(apiKey), hasRepo: Boolean(repository) };
    if (typeof log.info === 'function') log.info(data, msg);
    else log(msg, data);
    return;
  }

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

  const auth = Buffer.from(`${apiKey}:`).toString('base64');

  fetch(CURSOR_AGENTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const payload = { status: res.status, body: data, issueKey };
        if (typeof log.info === 'function') log.info(payload, 'cursor agent launch failed');
        else log(payload, 'cursor agent launch failed');
        return;
      }
      const payload = { agentId: data.id, issueKey, branchName: data.target?.branchName };
      if (typeof log.info === 'function') log.info(payload, 'cursor agent launched');
      else log(payload, 'cursor agent launched');
    })
    .catch((err) => {
      const payload = { err: err.message, issueKey };
      if (typeof log.info === 'function') log.info(payload, 'cursor agent request error');
      else log(payload, 'cursor agent request error');
    });
}
