import type { Connection } from "@jsforce/jsforce-node";

import type { SalesforceRecordEnum } from "../enums";
import { ISalesforceFieldCacheRepository } from "../repository/SalesforceFieldCacheRepository.interface";
import type { SalesforceField } from "../types";

export class SalesforceFieldCacheService {
  private conn: Connection;
  private fieldCacheRepository: ISalesforceFieldCacheRepository;

  constructor({
    fieldCacheRepository,
    conn,
  }: {
    fieldCacheRepository: ISalesforceFieldCacheRepository;
    conn: Connection;
  }) {
    this.conn = conn;
    this.fieldCacheRepository = fieldCacheRepository;
  }

  async getFields({ credentialId, recordType }: { credentialId: number; recordType: SalesforceRecordEnum }) {
    // First check if we have the field data in the DB
    const cachedFields = await this.fieldCacheRepository.getByCredentialId({ credentialId, recordType });
    if (cachedFields) {
      console.log("Field cache has been hit");
      return cachedFields.fields;
    }

    // If not, fetch the fields from Salesforce and cache them
    const fieldQuery = await this.conn.sobject(recordType).describe();
    const fields = fieldQuery.fields;

    const fieldsToStore = fields.map((field) => {
      return {
        name: field.name,
        type: field.type,
        length: field?.length,
        pickListValues: field?.picklistValues?.map((picklistValue) => ({
          active: picklistValue?.active,
          value: picklistValue?.value,
        })),
      };
    });

    await this.fieldCacheRepository.create({ credentialId, recordType, fields: fieldsToStore });

    return fields as SalesforceField[];
  }
}
