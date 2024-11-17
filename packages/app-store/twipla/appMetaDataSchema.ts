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
  extendsFeature: z.string(),
  appData: z.object({
    tag: z.object({
      scripts: z.array(
        z.object({
          content: z.string(),
        })
      ),
    }),
  }),
  isTemplate: z.boolean(),
  __createdUsingCli: z.boolean(),
  __template: z.string(),
});

export { configSchema };
