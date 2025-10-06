import type { SalesforceRecordEnum } from "../enums";
import type { SalesforceField } from "../types";

export interface ISalesforceFieldCacheRepository {
  create(args: {
    credentialId: number;
    recordType: SalesforceRecordEnum;
    fields: SalesforceField[];
  }): Promise<{ fields: SalesforceField[] }>;
  getByCredentialId(args: {
    credentialId: number;
    recordType: SalesforceRecordEnum;
  }): Promise<{ fields: SalesforceField[] }>;
  update(args: {
    credentialId: number;
    recordType: SalesforceRecordEnum;
    fields: SalesforceField[];
  }): Promise<{ fields: SalesforceField[] }>;
}
