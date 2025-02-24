import z from "zod";

import { ZColumnFilter, ZSorting } from "@calcom/features/data-table/lib/types";
import type { ColumnFilter, Sorting } from "@calcom/features/data-table/lib/types";

export type RawDataInput = {
  startDate: string;
  endDate: string;
  teamId?: number | null;
  userId?: number | null;
  memberUserId?: number | null;
  isAll?: boolean;
  eventTypeId?: number | null;
};

export const rawDataInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.coerce.number().optional().nullable(),
  userId: z.coerce.number().optional().nullable(),
  memberUserId: z.coerce.number().optional().nullable(),
  isAll: z.boolean().optional(),
  eventTypeId: z.coerce.number().optional().nullable(),
}) satisfies z.ZodType<RawDataInput>;

export type RoutingFormResponsesInput = {
  startDate: string;
  endDate: string;
  teamId?: number;
  userId?: number;
  memberUserIds?: number[];
  isAll: boolean;
  routingFormId?: string;
  cursor?: number;
  limit?: number;
  columnFilters: ColumnFilter[];
  sorting?: Sorting[];
};

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
  sorting: z.array(ZSorting).optional(),
}) satisfies z.ZodType<RoutingFormResponsesInput>;
