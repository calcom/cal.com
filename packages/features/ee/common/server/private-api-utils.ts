import crypto from "crypto";

export const generateNonce = (): string => {
  return crypto.randomBytes(16).toString("hex");
};

// Utility function to create a signature
export const createSignature = (body: Record<string, unknown>, nonce: string, secretKey: string): string => {
  return crypto
    .createHmac("sha256", secretKey)
    .update(JSON.stringify(body) + nonce)
    .digest("hex");
};
