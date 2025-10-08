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

export type InsightsRoutingServiceInput = {
  scope: "user" | "team" | "org";
  selectedTeamId?: number;

  columnFilters?: ColumnFilter[];
  startDate: string;
  endDate: string;
};

export type InsightsRoutingServicePaginatedInput = InsightsRoutingServiceInput & {
  sorting?: Sorting[];
  offset: number;
  limit: number;
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

export const insightsRoutingServiceInputSchema = z.object({
  scope: z.union([z.literal("user"), z.literal("team"), z.literal("org")]),
  selectedTeamId: z.number().optional(),
  columnFilters: z.array(ZColumnFilter).optional(),
  startDate: z.string(),
  endDate: z.string(),
}) satisfies z.ZodType<InsightsRoutingServiceInput>;

export const insightsRoutingServicePaginatedInputSchema = z.object({
  ...insightsRoutingServiceInputSchema.shape,
  offset: z.number(),
  limit: z.number().max(100),
  sorting: z.array(ZSorting).optional(),
}) satisfies z.ZodType<InsightsRoutingServicePaginatedInput>;

export const routingRepositoryBaseInputSchema = z.object({
  scope: z.union([z.literal("user"), z.literal("team"), z.literal("org")]),
  selectedTeamId: z.number().optional(),
  startDate: z.string(),
  endDate: z.string(),
  columnFilters: z.array(ZColumnFilter).optional(),
});

export const routedToPerPeriodInputSchema = routingRepositoryBaseInputSchema.extend({
  period: z.enum(["perDay", "perWeek", "perMonth"]),
  limit: z.number().int().min(1).max(100).default(10),
  searchQuery: z.string().trim().min(1).optional(),
});

export const routedToPerPeriodCsvInputSchema = routingRepositoryBaseInputSchema.extend({
  period: z.enum(["perDay", "perWeek", "perMonth"]),
  searchQuery: z.string().trim().min(1).optional(),
});

export const bookingRepositoryBaseInputSchema = z.object({
  scope: z.union([z.literal("user"), z.literal("team"), z.literal("org")]),
  selectedTeamId: z.number().optional(),
  timeZone: z.string(),
  columnFilters: z.array(ZColumnFilter).optional(),
});
