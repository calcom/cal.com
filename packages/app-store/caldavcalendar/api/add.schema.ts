import { z } from "zod";

export const caldavAddBodySchema = z.object({
  username: z.string(),
  password: z.string(),
  url: z.string().url(),
});
