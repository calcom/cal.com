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
  isOAuth: z.boolean(),
  __createdUsingCli: z.boolean(),
  appData: z.object({
    location: z.object({
      type: z.string(),
      label: z.string(),
      linkType: z.string(),
      organizerInputPlaceholder: z.string().url(),
      urlRegExp: z.string(),
    }),
  }),
});

export { configSchema };
