import { z } from "zod";

const configSchema = z.object({
  name: z.string(),
  title: z.string(),
  isGlobal: z.boolean(),
  slug: z.string(),
  type: z.string(),
  logo: z.string(),
  url: z.string().url(),
  variant: z.string(),
  categories: z.array(z.string()),
  publisher: z.string(),
  simplePath: z.string(),
  email: z.string().email(),
  licenseRequired: z.boolean(),
  teamsPlanRequired: z.object({
    upgradeUrl: z.string(),
  }),
  description: z.string(),
  __createdUsingCli: z.boolean(),
  isOAuth: z.boolean(),
});

export { configSchema };
