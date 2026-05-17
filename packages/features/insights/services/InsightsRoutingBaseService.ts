import type { TypedColumnFilter } from "@calcom/features/data-table/lib/types";
import type { DateRange } from "@calcom/features/insights/server/insightsDateUtils";
import type { PrismaClient } from "@calcom/prisma";
import type { BookingStatus } from "@calcom/prisma/enums";
import type { FilterType } from "@calcom/types/data-table";
import { z } from "zod";

export const insightsRoutingServiceOptionsSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("user"),
    userId: z.number(),
    orgId: z.number().nullish().optional(),
  }),
  z.object({
    scope: z.literal("org"),
    userId: z.number(),
    orgId: z.number(),
  }),
  z.object({
    scope: z.literal("team"),
    userId: z.number(),
    orgId: z.number().nullish().optional(),
    teamId: z.number(),
  }),
]);

export type InsightsRoutingServicePublicOptions = {
  scope: "user" | "org" | "team";
  userId: number;
  orgId: number | null | undefined;
  teamId?: number;
};

export type InsightsRoutingServiceOptions = z.infer<typeof insightsRoutingServiceOptionsSchema>;

export type InsightsRoutingServiceFilterOptions = {
  startDate: string;
  endDate: string;
  columnFilters?: TypedColumnFilter<FilterType>[];
};

export type InsightsRoutingTableItem = {
  id: number;
  uuid: string | null;
  formId: string;
  formName: string;
  formTeamId: number | null;
  formUserId: number;
  bookingUid: string | null;
  bookingId: number | null;
  bookingStatus: BookingStatus | null;
  bookingStatusOrder: number | null;
  bookingCreatedAt: Date | null;
  [key: string]: unknown;
};

// Routing forms have been removed from this fork.
// This is a stub that returns empty data for all routing analytics methods.
export class InsightsRoutingBaseService {
  constructor(_params: {
    prisma: PrismaClient;
    options: InsightsRoutingServicePublicOptions;
    filters: InsightsRoutingServiceFilterOptions;
  }) {}

  async getRoutingFormStats() {
    return { data: [], total: 0 };
  }

  async getTableData(_params: { sorting?: unknown; limit?: number; offset?: number }) {
    return { data: [] as InsightsRoutingTableItem[], total: 0 };
  }

  async getFailedBookingsByFieldData() {
    return [];
  }

  async getRoutedToPerPeriodData(_params: { period: string; limit?: number; searchQuery?: string }) {
    return { data: [], total: 0 };
  }

  async getRoutedToPerPeriodCsvData(_params: { period: string; searchQuery?: string }) {
    return [];
  }

  async getRoutingFunnelData(_dateRanges: DateRange[]) {
    return [];
  }
}
