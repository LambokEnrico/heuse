import { randomBytes, createHmac, timingSafeEqual } from "crypto";

/**
 * Order view token utilities.
 *
 * The /checkout/success/[orderNumber] page exposes customer PII (name, email,
 * phone, full shipping address, payment status). Previously, this was
 * accessible to anyone who knew the orderNumber — an IDOR that risked
 * exposing customer data to attackers who obtained the orderNumber via
 * leaked emails, browser history, support chat screenshots, etc.
 *
 * Mitigations:
 *   1. Generate a random 32-byte token at order creation
 *   2. Embed the token in the success URL (in the order's return_url from PayPal)
 *   3. The success page requires BOTH orderNumber AND the valid token
 *   4. Token expires after 30 days (configurable)
 *
 * Tokens are stored hashed in the database (HMAC-SHA256 of the raw token,
 * keyed with a server secret). This means a DB leak does NOT directly
 * expose active order view tokens.
 *
 * Why HMAC and not bcrypt?
 *   - Tokens are high-entropy (256 bits random), so brute force is infeasible
 *   - HMAC is fast and deterministic (we don't need salt per-token)
 *   - We use `timingSafeEqual` for constant-time comparison
 *
 * The "salt" is the server secret (`process.env.ORDER_TOKEN_SECRET` or
 * `NEXTAUTH_SECRET` as fallback). This MUST be kept secret.
 */

const TOKEN_BYTES = 32; // 256 bits of entropy
const DEFAULT_TTL_DAYS = 30;

function getSecret(): string {
  const secret =
    process.env.ORDER_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";
  if (!secret) {
    throw new Error(
      "ORDER_TOKEN_SECRET (or NEXTAUTH_SECRET) must be set to issue order view tokens"
    );
  }
  return secret;
}

/**
 * Generate a new random order view token (raw form, send to client).
 * Returns the token + its HMAC hash + expiry date.
 */
export function issueOrderViewToken(ttlDays: number = DEFAULT_TTL_DAYS): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const hash = hashOrderViewToken(token);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

/**
 * HMAC-SHA256 the raw token with the server secret. Constant result for
 * the same (token, secret) pair.
 */
export function hashOrderViewToken(token: string): string {
  return createHmac("sha256", getSecret()).update(token).digest("hex");
}

/**
 * Constant-time comparison of a raw token against a stored hash.
 * Returns false on any error (e.g. malformed token, missing secret).
 */
export function verifyOrderViewToken(
  token: string | null | undefined,
  storedHash: string | null | undefined
): boolean {
  if (!token || !storedHash) return false;
  try {
    const expected = Buffer.from(storedHash, "hex");
    const actual = Buffer.from(hashOrderViewToken(token), "hex");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * Check whether a token is still valid (not expired).
 */
export function isTokenExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() < Date.now();
}
