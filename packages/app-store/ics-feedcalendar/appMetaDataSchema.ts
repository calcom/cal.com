import { z } from "zod";

const configSchema = z.object({
  name: z.string(),
  title: z.string(),
  slug: z.string(),
  dirName: z.string(),
  type: z.string(),
  logo: z.string(),
  variant: z.string(),
  categories: z.array(z.string()),
  publisher: z.string(),
  email: z.string().email(),
  description: z.string(),
  isTemplate: z.boolean(),
  __createdUsingCli: z.boolean(),
});

export { configSchema };
