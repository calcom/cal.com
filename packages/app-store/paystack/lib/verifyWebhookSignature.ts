import crypto from "crypto";

export function verifyWebhookSignature(body: string, signature: string, secretKey: string): boolean {
  if (!signature) return false;

  const hash = crypto.createHmac("sha512", secretKey).update(body).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}
