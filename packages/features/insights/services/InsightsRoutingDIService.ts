import type { PrismaClient } from "@calcom/prisma";

import {
  InsightsRoutingBaseService,
  type InsightsRoutingServicePublicOptions,
  type InsightsRoutingServiceFilterOptions,
} from "./InsightsRoutingBaseService";

export interface IInsightsRoutingService {
  prisma: PrismaClient;
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
