import { z } from "zod";

const configSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  variant: z.string(),
  logo: z.string(),
  publisher: z.string(),
  url: z.string().url(),
  verified: z.boolean(),
  rating: z.number().min(0).max(5),
  reviews: z.number().min(0),
  categories: z.array(z.string()),
  slug: z.string(),
  title: z.string(),
  trending: z.boolean(),
  email: z.string().email(),
  appData: z.object({
    location: z.object({
      linkType: z.string(),
      type: z.string(),
      label: z.string(),
    }),
  }),
  dirName: z.string(),
  concurrentMeetings: z.boolean(),
  isOAuth: z.boolean(),
});

export { configSchema };
