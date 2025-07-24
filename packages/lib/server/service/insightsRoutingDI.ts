import type { readonlyPrisma } from "@calcom/prisma";

import {
  InsightsRoutingBaseService,
  type InsightsRoutingServicePublicOptions,
  type InsightsRoutingServiceFilterOptions,
} from "./insightsRoutingBase";

export interface IInsightsRoutingService {
  prisma: typeof readonlyPrisma;
}

export class InsightsRoutingService {
  constructor(private readonly dependencies: IInsightsRoutingService) {}

  create({
    options,
    filters,
  }: {
    options: InsightsRoutingServicePublicOptions;
    filters: InsightsRoutingServiceFilterOptions;
  }): InsightsRoutingBaseService {
    return new InsightsRoutingBaseService({
      prisma: this.dependencies.prisma,
      options,
      filters,
    });
  }
}
