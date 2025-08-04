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
  offset?: number;
  limit?: number;
};

export const rawDataInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.coerce.number().optional().nullable(),
  userId: z.coerce.number().optional().nullable(),
  memberUserId: z.coerce.number().optional().nullable(),
  isAll: z.boolean().optional(),
  eventTypeId: z.coerce.number().optional().nullable(),
  offset: z.number().optional(),
  limit: z.number().max(100).optional(),
}) satisfies z.ZodType<RawDataInput>;

export type RoutingFormStatsInput = {
  startDate: string;
  endDate: string;
  teamId?: number;
  userId?: number;
  memberUserIds?: number[];
  isAll: boolean;
  routingFormId?: string;
  columnFilters: ColumnFilter[];
  sorting?: Sorting[];
};

export type RoutingFormResponsesInput = RoutingFormStatsInput & {
  offset?: number;
  limit?: number;
};

export const routingFormStatsInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  teamId: z.coerce.number().optional(),
  userId: z.coerce.number().optional(),
  memberUserIds: z.number().array().optional(),
  isAll: z.coerce.boolean(),
  routingFormId: z.string().optional(),
  columnFilters: z.array(ZColumnFilter),
  sorting: z.array(ZSorting).optional(),
}) satisfies z.ZodType<RoutingFormStatsInput>;

export const routingFormResponsesInputSchema = z.object({
  ...routingFormStatsInputSchema.shape,
  offset: z.number().optional(),
  limit: z.number().max(100).optional(),
}) satisfies z.ZodType<RoutingFormResponsesInput>;

export const routingRepositoryBaseInputSchema = z.object({
  scope: z.union([z.literal("user"), z.literal("team"), z.literal("org")]),
  selectedTeamId: z.number().optional(),
  startDate: z.string(),
  endDate: z.string(),
  columnFilters: z.array(ZColumnFilter).optional(),
});

export const bookingRepositoryBaseInputSchema = z.object({
  scope: z.union([z.literal("user"), z.literal("team"), z.literal("org")]),
  selectedTeamId: z.number().optional(),
  startDate: z.string(),
  endDate: z.string(),
  timeZone: z.string(),
  eventTypeId: z.coerce.number().optional().nullable(),
  memberUserId: z.coerce.number().optional().nullable(),
});
