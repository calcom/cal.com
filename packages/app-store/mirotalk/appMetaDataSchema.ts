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
      label: z.string(),
      linkType: z.string(),
      organizerInputPlaceholder: z.string().url(),
      urlRegExp: z.string().regex(/^(http|https):\/\/(p2p|sfu)\.mirotalk\.com\/join\/[a-zA-Z0-9]+$/),
    }),
  }),
  description: z.string(),
  isTemplate: z.boolean(),
  __createdUsingCli: z.boolean(),
  __template: z.string(),
  dirName: z.string(),
  isOAuth: z.boolean(),
});

export { configSchema };
