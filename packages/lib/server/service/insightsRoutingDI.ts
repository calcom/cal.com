import type { readonlyPrisma } from "@calcom/prisma";

import {
  InsightsRoutingBaseService,
  type InsightsRoutingServicePublicOptions,
  type InsightsRoutingServiceFilterOptions,
} from "./insightsRoutingBase";

export interface Dependencies {
  prisma: typeof readonlyPrisma;
}

export class InsightsRoutingService {
  constructor(private readonly deps: Dependencies) {}

  create({
    options,
    filters,
  }: {
    options: InsightsRoutingServicePublicOptions;
    filters: InsightsRoutingServiceFilterOptions;
  }): InsightsRoutingBaseService {
    return new InsightsRoutingBaseService({
      prisma: this.deps.prisma,
      options,
      filters,
    });
  }
}
