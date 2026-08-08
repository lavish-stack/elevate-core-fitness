// Server-only module. Implements Razorpay's two distinct HMAC-SHA256
// signature schemes:
//  - Checkout signature (returned to the browser's `handler` callback):
//      HMAC_SHA256(`${order_id}|${payment_id}`, RAZORPAY_KEY_SECRET)
//  - Webhook signature (`x-razorpay-signature` header):
//      HMAC_SHA256(<raw request body>, RAZORPAY_WEBHOOK_SECRET)
//
// Uses the Web Crypto API (`crypto.subtle`) rather than Node's `crypto`
// module, since this repo's .gitignore references Cloudflare Workers
// (.wrangler/, .dev.vars) as a plausible deploy target — Web Crypto works
// in both Node (18+) and Workers, whereas `node:crypto` does not run on
// Workers without extra compatibility flags.

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time-ish comparison for hex digest strings. */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies the signature Razorpay's Checkout.js `handler` callback returns
 * to the browser after a successful charge attempt. This confirms the
 * `razorpay_order_id`/`razorpay_payment_id` pair genuinely came from
 * Razorpay for THIS order — it is not, by itself, proof of final capture
 * (the webhook is the authoritative source for that), but it is what makes
 * it safe to trust the payment_id the browser reports.
 */
export async function verifyCheckoutSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): Promise<boolean> {
  const expected = await hmacSha256Hex(params.keySecret, `${params.orderId}|${params.paymentId}`);
  return safeEqualHex(expected, params.signature.toLowerCase());
}

/**
 * Verifies a Razorpay webhook request. `rawBody` MUST be the exact,
 * unparsed request body text — hashing a re-serialized JSON.stringify of
 * the parsed body will not match Razorpay's signature.
 */
export async function verifyWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
}): Promise<boolean> {
  const expected = await hmacSha256Hex(params.webhookSecret, params.rawBody);
  return safeEqualHex(expected, params.signatureHeader.toLowerCase());
}
