/**
 * Extracts a plain-text prompt from a Jira webhook payload for use with the Cursor Agent API.
 * Handles Atlassian Document Format (ADF) in description.
 */

/**
 * Recursively extract plain text from an ADF node.
 * @param {object} node - ADF node (doc, paragraph, text, etc.)
 * @returns {string}
 */
function adfToPlainText(node) {
  if (node == null) return '';

  if (node.type === 'text') {
    return node.text ?? '';
  }

  if (Array.isArray(node.content)) {
    const parts = node.content.map(adfToPlainText);
    if (node.type === 'paragraph' || node.type === 'heading') {
      return parts.join('').trim() + '\n';
    }
    if (node.type === 'listItem') {
      return '- ' + parts.join('').trim() + '\n';
    }
    return parts.join('');
  }

  return '';
}

/**
 * Convert Jira description field to plain text (handles ADF or string).
 * @param {object|string|null} description - fields.description from Jira
 * @returns {string}
 */
function descriptionToPlainText(description) {
  if (description == null) return '';
  if (typeof description === 'string') return description.trim();

  if (typeof description === 'object' && description.type === 'doc') {
    return adfToPlainText(description).trim();
  }

  return String(description).trim();
}

/**
 * Normalize a repo value from Jira (e.g. "org/repo" or full URL) to a full GitHub URL.
 * @param {string} value - gh_repo from Jira
 * @returns {string|null} - https://github.com/org/repo or null if invalid
 */
function normalizeRepoUrl(value) {
  if (value == null || typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(s)) return `https://github.com/${s}`;
  return null;
}

/**
 * Build prompt text and issue key from a Jira issue_updated webhook body.
 * @param {object} payload - Jira webhook body (with issue, optionally fields)
 * @param {{ jiraBaseUrl?: string, ghRepoField?: string }} [options] - jiraBaseUrl: add Jira link to PR instruction; ghRepoField: Jira field key for repo (default 'gh_repo', or use customfield_XXXXX)
 * @returns {{ text: string, issueKey: string, repo?: string } | null} - null if no usable prompt; repo from issue.fields.gh_repo (or options.ghRepoField) when present
 */
export function getPromptFromJiraPayload(payload, options = {}) {
  const issue = payload?.issue;
  const issueKey = issue?.key;
  if (!issueKey) return null;

  const fields = issue?.fields ?? {};
  const summary = typeof fields.summary === 'string' ? fields.summary.trim() : '';
  const description = descriptionToPlainText(fields.description);

  const parts = [];
  if (summary) parts.push(`**Summary:** ${summary}`);
  if (description) parts.push(`**Description:**\n${description}`);

  let text = parts.length
    ? `Implement the following from Jira ${issueKey}:\n\n${parts.join('\n\n')}`
    : summary || null;

  if (!text || !text.trim()) return null;

  const { jiraBaseUrl, ghRepoField = 'gh_repo' } = options;
  if (jiraBaseUrl) {
    const ticketUrl = `${jiraBaseUrl.replace(/\/$/, '')}/browse/${issueKey}`;
    text += `\n\nIn the pull request description, include a link to the Jira ticket: ${ticketUrl}`;
  }

  const repoValue = fields[ghRepoField];
  const repo = normalizeRepoUrl(typeof repoValue === 'string' ? repoValue : repoValue?.value ?? repoValue) ?? undefined;

  return { text: text.trim(), issueKey, ...(repo && { repo }) };
}
