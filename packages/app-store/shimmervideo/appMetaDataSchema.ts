import { z } from "zod";

const configSchema = z.object({
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  logo: z.string(),
  url: z.string().url(),
  variant: z.string(),
  categories: z.array(z.string()),
  publisher: z.string(),
  email: z.string().email(),
  description: z.string(),
  isTemplate: z.boolean(),
  __createdUsingCli: z.boolean(),
  __template: z.string(),
  appData: z.object({
    location: z.object({
      linkType: z.string(),
      type: z.string(),
      label: z.string(),
    }),
  }),
  isOAuth: z.boolean().optional(),
});

export { configSchema };
