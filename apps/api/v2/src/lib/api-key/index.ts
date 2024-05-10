import { createHash } from "crypto";

export const hashAPIKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");
