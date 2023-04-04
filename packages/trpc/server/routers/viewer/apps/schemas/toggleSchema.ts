import { object, string, boolean } from "zod";

export const toggleSchema = object({
  slug: string(),
  enabled: boolean(),
});
