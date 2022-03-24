import { z } from "zod";

const schema = z
  .object({
    title: z.string().min(3),
    slug: z.string().min(3),
    length: z.number().min(1).max(1440), // max is a full day.
    description: z.string().min(3).optional(),
  })
  .strict(); // Adding strict so that we can disallow passing in extra fields

export default schema;
