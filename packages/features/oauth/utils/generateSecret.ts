import { randomBytes, createHash } from "node:crypto";

const hashSecretKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

// Generate a random secret
export const generateSecret = (secret = randomBytes(32).toString("hex")) => [hashSecretKey(secret), secret];
