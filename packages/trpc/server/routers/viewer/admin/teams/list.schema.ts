import { z } from "zod";

export const ZListTeamsSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).default(25),
  searchTerm: z.string().optional(),
  type: z.enum(["ALL", "TEAM", "ORGANIZATION"]).default("ALL"),
  subscriptionStatus: z.array(z.string()).optional(),
  hasBillingIssues: z.boolean().optional(),
  dateRange: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .optional(),
  parentId: z.number().optional(),
});

export type TListTeamsSchema = z.infer<typeof ZListTeamsSchema>;
