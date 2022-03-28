import { withValidation } from "next-validations";
import { z } from "zod";

const schemaTeam = z
  .object({
    slug: z.string().min(3),
    name: z.string().min(3),
    hideBranding: z.boolean().default(false),
    bio: z.string().min(3).optional(),
    logo: z.string().optional(),
  })
  .strict(); 
const withValidTeam = withValidation({
  schema: schemaTeam,
  type: "Zod",
  mode: "body",
});

export { schemaTeam, withValidTeam };
