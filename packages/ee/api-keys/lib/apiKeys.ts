import { randomBytes, createHash } from "crypto";

// Hash the API key to check against when veriying it. so we don't have to store the key in plain text.
export const hashAPIKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

// Generate a random API key. Prisma already makes sure it's unique. So no need to add salts like with passwords.
export const generateUniqueAPIKey = (apiKey = randomBytes(16).toString("hex")) => [
  hashAPIKey(apiKey),
  apiKey,
];
