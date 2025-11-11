import { z } from "zod";

export const ZMoveToOrganizationSchema = z.object({
  teamId: z.number(),
  newSlug: z.string().optional(),
});

export type TMoveToOrganizationSchema = z.infer<typeof ZMoveToOrganizationSchema>;
