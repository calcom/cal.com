import { object, string, unknown } from "zod";

export const saveKeysSchema = object({
  slug: string(),
  dirName: string(),
  type: string(),
  // Validate w/ app specific schema
  keys: unknown(),
});
