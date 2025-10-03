import { PrismaClient } from "@prisma/client";

import { SalesforceField } from "../types";

export class PrismaSalesforceFieldCacheRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create({ eventTypeId, fields }: { eventTypeId: string; fields: SalesforceField[] }) {
    return this.prisma.app_Salesforce_RecordFieldCache.create({
      data: {
        eventTypeId,
        fields,
      },
    });
  }

  async getByEventTypeId(eventTypeId: string) {
    return this.prisma.app_Salesforce_RecordFieldCache.findUnique({
      where: {
        eventTypeId,
      },
    });
  }

  async update({ eventTypeId, fields }: { eventTypeId: string; fields: SalesforceField[] }) {
    return this.prisma.app_Salesforce_RecordFieldCache.update({
      where: {
        eventTypeId,
      },
      data: {
        fields,
      },
    });
  }
}
