import { createHash, randomBytes } from "node:crypto";

export const hashSecretKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

export const generateSecret = (secret = randomBytes(32).toString("hex")) => [hashSecretKey(secret), secret];
