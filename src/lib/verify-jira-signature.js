import crypto from 'crypto';

const SIGNATURE_HEADER = 'x-hub-signature';
const PREFIX = 'sha256=';

/**
 * Verify Jira webhook signature (HMAC-SHA256 of raw body).
 * @param {string} secret - Webhook secret from Jira
 * @param {Buffer} rawBody - Raw request body (must not be parsed/modified)
 * @param {string} signatureHeader - Value of X-Hub-Signature header
 * @returns {boolean}
 */
export function verifyJiraSignature(secret, rawBody, signatureHeader) {
  if (!secret || !signatureHeader || !rawBody) return false;
  const received = signatureHeader.trim().toLowerCase().replace(PREFIX, '');
  if (!received) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
