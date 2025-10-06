import { PrismaClient } from "@prisma/client";

import { SalesforceRecordEnum } from "../enums";
import type { ISalesforceFieldCacheRepository } from "../repository/SalesforceFieldCacheRepository.interface";
import { SalesforceField } from "../types";

export class PrismaSalesforceFieldCacheRepository implements ISalesforceFieldCacheRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async create(args: { credentialId: number; recordType: SalesforceRecordEnum; fields: SalesforceField[] }) {
    return this.prisma.app_Salesforce_RecordFieldCache.create({
      data: {
        ...args,
      },
    });
  }

  async getByCredentialId(args: { credentialId: number; recordType: SalesforceRecordEnum }) {
    return this.prisma.app_Salesforce_RecordFieldCache.findUnique({
      where: {
        credentialId_recordType: {
          credentialId: args.credentialId,
          recordType: args.recordType,
        },
      },
    });
  }

  async update(args: { credentialId: number; recordType: SalesforceRecordEnum; fields: SalesforceField[] }) {
    const { credentialId, recordType, fields } = args;
    return this.prisma.app_Salesforce_RecordFieldCache.update({
      where: {
        credentialId_recordType: {
          credentialId,
          recordType,
        },
      },
      data: {
        fields,
      },
    });
  }
}
