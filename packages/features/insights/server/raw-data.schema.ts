import z from "zod";

import { ZColumnFilter, ZSorting } from "@calcom/features/data-table";

export const rawDataInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.coerce.number().optional().nullable(),
  userId: z.coerce.number().optional().nullable(),
  memberUserId: z.coerce.number().optional().nullable(),
  isAll: z.coerce.boolean().optional(),
  eventTypeId: z.coerce.number().optional().nullable(),
});

export type RawDataInput = z.infer<typeof rawDataInputSchema>;

export const routingFormResponsesInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.coerce.number().optional(),
  userId: z.coerce.number().optional(),
  memberUserIds: z.number().array().optional(),
  isAll: z.coerce.boolean(),
  routingFormId: z.string().optional(),
  cursor: z.number().optional(),
  limit: z.number().optional(),
  columnFilters: z.array(ZColumnFilter),
  sorting: z.array(ZSorting),
});

export type RoutingFormResponsesInput = z.infer<typeof routingFormResponsesInputSchema>;
