import { z } from "zod";

const configSchema = z.object({
  title: z.string().optional(), // Optional title field if required
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  logo: z.string(),
  url: z.string().url(),
  variant: z.string(),
  categories: z.array(z.string()),
  extendsFeature: z.string(),
  publisher: z.string(),
  email: z.string().email(),
  description: z.string(),
  isTemplate: z.boolean(),
  __createdUsingCli: z.boolean(),
  __template: z.string().optional(), // Optional template field if present
  isOAuth: z.boolean(),
});

export { configSchema };
