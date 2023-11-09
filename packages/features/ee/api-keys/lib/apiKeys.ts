import { randomBytes, createHash } from "crypto";
import { z } from "zod";

// Hash the API key to check against when veriying it. so we don't have to store the key in plain text.
export const hashAPIKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

// Generate a random API key. Prisma already makes sure it's unique. So no need to add salts like with passwords.
export const generateUniqueAPIKey = (apiKey = randomBytes(16).toString("hex")) => [
  hashAPIKey(apiKey),
  apiKey,
];

export const apiKeySchema = z.string({ required_error: "No apiKey provided" }).refine(
  (value) => {
    // Check if it starts with process.env.API_KEY_PREFIX
    if (!value.startsWith(process.env.API_KEY_PREFIX || "cal_")) {
      return false;
    }
    // Extract the hash part and validate its format
    const hashPart = value.slice((process.env.API_KEY_PREFIX || "cal_").length); // Remove prefix
    const hashRegex = /^[a-f0-9]{32}$/i; // Regex for a 32-character hexadecimal hash

    return hashRegex.test(hashPart);
  },
  {
    message: "Your apiKey is not valid",
  }
);
