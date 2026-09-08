/**
 * The billing footgun (integration brief §2).
 *
 * If the Agent SDK sees ANTHROPIC_API_KEY it uses it, and every call becomes
 * metered billing — silently, with no error. An *empty* `ANTHROPIC_API_KEY=`
 * line in .env.local is enough to do it: Next loads it as "", which is still
 * a present key as far as the SDK is concerned, and it shadows the OAuth
 * credentials.
 *
 * Import this module for its side effect at every Claude call site. It is
 * idempotent and costs nothing.
 */

if (process.env.ANTHROPIC_API_KEY === "") {
  delete process.env.ANTHROPIC_API_KEY;
}

/**
 * True when a real (non-empty) API key is present — meaning calls WILL be
 * billed per token. Surfaced in the smoke test so a misconfiguration is
 * visible immediately rather than at the end of a billing cycle.
 */
export function isMeteredBillingActive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
