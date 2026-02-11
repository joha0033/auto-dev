/**
 * Bounded in-memory store for webhook identifiers to deduplicate Jira retries.
 * Evicts oldest entries when capacity is reached.
 */
const DEFAULT_CAPACITY = 10_000;

export function createDedupeStore(capacity = DEFAULT_CAPACITY) {
  const seen = new Set();
  const order = [];

  return {
    has(id) {
      return seen.has(id);
    },

    add(id) {
      if (!id || seen.has(id)) return;
      if (order.length >= capacity) {
        const oldest = order.shift();
        seen.delete(oldest);
      }
      order.push(id);
      seen.add(id);
    },
  };
}
