/**
 * Detects if a Jira issue_updated payload represents a status change from TODO → In Progress.
 * Jira may send "To Do", "To Do ", "TODO", etc.; we normalize for comparison.
 */
function normalizeStatus(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

const TODO_ALIASES = ['to do', 'todo', 'to_do'];
const IN_PROGRESS_ALIASES = ['in progress', 'inprogress', 'in_progress'];

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
 * @returns {{ detected: boolean, issueKey?: string, from?: string, to?: string }}
 */
export function detectTodoToInProgress(payload) {
  if (payload?.webhookEvent !== 'jira:issue_updated') {
    return { detected: false };
  }

  const issueKey = payload.issue?.key;
  const items = payload.changelog?.items ?? [];
  const statusChange = items.find((item) => item.field === 'status');

  if (!statusChange) return { detected: false, issueKey };

  const from = statusChange.fromString ?? statusChange.from;
  const to = statusChange.toString ?? statusChange.to;

  if (isTodo(from) && isInProgress(to)) {
    return { detected: true, issueKey, from: statusChange.fromString ?? from, to: statusChange.toString ?? to };
  }

  return { detected: false, issueKey };
}
