import { z } from "zod";

const configSchema = z.object({
  name: z.string(),
  description: z.string(),
  slug: z.string(),
  type: z.string(),
  title: z.string(),
  variant: z.string(),
  category: z.string(),
  categories: z.array(z.string()),
  logo: z.string(),
  publisher: z.string(),
  url: z.string().url(),
  email: z.string().email(),
  isAuth: z.boolean(),
});

export { configSchema };
