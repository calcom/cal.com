import { z } from "zod";

const configSchema = z.object({
  title: z.string(),
  name: z.string(),
  slug: z.string(),
  dirName: z.string(),
  type: z.string(),
  logo: z.string(),
  url: z.string().url(),
  variant: z.string(),
  categories: z.array(z.string()),
  publisher: z.string(),
  email: z.string().email(),
  description: z.string(),
  __createdUsingCli: z.boolean(),
  isOAuth: z.boolean(),
});

export { configSchema };
