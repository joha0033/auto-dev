import crypto from 'crypto';

const PREFIX = 'sha256=';

/**
 * Verify Cursor webhook signature (HMAC-SHA256 of raw body).
 * @param {string} secret - Webhook secret (same as passed when creating the agent)
 * @param {Buffer} rawBody - Raw request body (must not be parsed/modified)
 * @param {string} signatureHeader - Value of X-Webhook-Signature header
 * @returns {boolean}
 */
export function verifyCursorSignature(secret, rawBody, signatureHeader) {
  if (!secret || !signatureHeader || !rawBody) return false;
  const received = signatureHeader.trim().replace(PREFIX, '');
  if (!received) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
