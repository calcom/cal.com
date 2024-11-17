import { z } from "zod";

const configSchema = z.object({
  "/*": z.string(),
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  logo: z.string(),
  url: z.string().url(),
  variant: z.string(),
  categories: z.array(z.string()),
  publisher: z.string(),
  email: z.string().email(),
  appData: z.object({
    location: z.object({
      type: z.string(),
      label: z.string().optional(),
      linkType: z.string(),
    }),
  }),
  description: z.string(),
  isTemplate: z.boolean(),
  __createdUsingCli: z.boolean(),
  __template: z.string().optional(),
});

export { configSchema };
