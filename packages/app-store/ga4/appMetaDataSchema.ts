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
  description: z.string(),
  extendsFeature: z.string(),
  appData: z.object({
    tag: z.object({
      scripts: z.array(
        z.object({
          src: z.string().optional(),
          content: z.string().optional(),
          attrs: z.record(z.string(), z.unknown()).optional(),
        })
      ),
    }),
  }),
  __createdUsingCli: z.boolean(),
  isOAuth: z.boolean(),
});

export { configSchema };
