import type { readonlyPrisma } from "@calcom/prisma";
import {
  InsightsBookingBaseService,
  type InsightsBookingServiceFilterOptions,
  type InsightsBookingServicePublicOptions,
} from "./InsightsBookingBaseService";

export interface IInsightsBookingService {
  prisma: typeof readonlyPrisma;
}

export class InsightsBookingService {
  constructor(private readonly dependencies: IInsightsBookingService) {}

  create({
    options,
    filters,
  }: {
    options: InsightsBookingServicePublicOptions;
    filters?: InsightsBookingServiceFilterOptions;
  }): InsightsBookingBaseService {
    return new InsightsBookingBaseService({
      prisma: this.dependencies.prisma,
      options,
      filters,
    });
  }
}
