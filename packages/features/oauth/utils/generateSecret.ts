import { randomBytes, createHash } from "node:crypto";

export const hashSecretKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

export const generateSecret = (secret = randomBytes(32).toString("hex")) => [hashSecretKey(secret), secret];

export const getSecretHint = (secret: string): string => secret.slice(-4);
