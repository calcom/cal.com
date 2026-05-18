import { z } from "zod";

const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");

export const ZCreateOrganizationInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  bio: z.string().trim().max(500).optional().nullable(),
});

export const ZUpdateOrganizationInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  bio: z.string().trim().max(500).optional().nullable(),
});

export type TCreateOrganizationInputSchema = z.infer<typeof ZCreateOrganizationInputSchema>;
export type TUpdateOrganizationInputSchema = z.infer<typeof ZUpdateOrganizationInputSchema>;
