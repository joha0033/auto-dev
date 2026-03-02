/**
 * Detects if a Jira issue_updated payload represents a status change from TODO → In Progress.
 * Jira may send "To Do", "To Do ", "TODO", etc.; we normalize for comparison.
 */
function normalizeStatus(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

const TODO_ALIASES = ['to do', 'todo', 'to_do', 'open', 'backlog'];
const IN_PROGRESS_ALIASES = ['in progress', 'inprogress', 'in_progress', 'in development'];

function isTodo(name) {
  const n = normalizeStatus(name);
  return TODO_ALIASES.some((a) => n === a || n.replace(/[\s_]/g, '') === a.replace(/[\s_]/g, ''));
}

function isInProgress(name) {
  const n = normalizeStatus(name);
  return IN_PROGRESS_ALIASES.some((a) => n === a || n.replace(/[\s_]/g, '') === a.replace(/[\s_]/g, ''));
}

/**
 * @param {object} payload - Jira webhook body (with webhookEvent, issue, changelog)
 * @returns {{ detected: boolean, issueKey?: string, from?: string, to?: string, debug?: { webhookEvent?: string, statusFrom?: string, statusTo?: string, hasStatusChange: boolean } }}
 */
export function detectTodoToInProgress(payload) {
  const issueKey = payload?.issue?.key;
  const webhookEvent = payload?.webhookEvent;

  // Jira Cloud may send "jira:issue_updated" or "issue_updated"
  const isIssueUpdated =
    webhookEvent === 'jira:issue_updated' || webhookEvent === 'issue_updated';
  if (!isIssueUpdated) {
    return {
      detected: false,
      issueKey,
      debug: { webhookEvent, hasStatusChange: false },
    };
  }

  const items = payload.changelog?.items ?? [];
  const statusChange = items.find((item) => item.field === 'status');

  if (!statusChange) {
    return {
      detected: false,
      issueKey,
      debug: {
        webhookEvent,
        hasStatusChange: false,
        changelogItemFields: items.map((i) => i.field),
      },
    };
  }

  const from = statusChange.fromString ?? statusChange.from;
  const to = statusChange.toString ?? statusChange.to;
  const fromStr = typeof from === 'string' ? from : String(from ?? '');
  const toStr = typeof to === 'string' ? to : String(to ?? '');

  if (isTodo(fromStr) && isInProgress(toStr)) {
    return { detected: true, issueKey, from: statusChange.fromString ?? fromStr, to: statusChange.toString ?? toStr };
  }

  return {
    detected: false,
    issueKey,
    debug: {
      webhookEvent,
      hasStatusChange: true,
      statusFrom: fromStr,
      statusTo: toStr,
      fromNormalized: normalizeStatus(fromStr),
      toNormalized: normalizeStatus(toStr),
    },
  };
}
