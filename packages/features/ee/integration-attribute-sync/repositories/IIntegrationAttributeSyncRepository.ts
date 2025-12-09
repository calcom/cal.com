import type { IAttributeSyncRule } from "../schemas/zod";

export enum AttributeSyncIntegrations {
  SALESFORCE = "salesforce",
}

export interface IntegrationAttributeSync {
  id: string;
  integration: AttributeSyncIntegrations;
  credentialId?: number;
  enabled: boolean;
  attributeSyncRules: AttributeSyncUserRule[];
}

export interface AttributeSyncUserRule {
  id: string;
  rule: IAttributeSyncRule;
  syncFieldMappings: AttributeSyncFieldMapping[];
}

export interface AttributeSyncFieldMapping {
  id: string;
  integrationFieldName: string;
  attributeId: number;

  enabled: boolean;
}

export interface IIntegrationAttributeSyncRepository {
  getIntegrationAttributeSyncs(organizationId: number): Promise<IntegrationAttributeSync[]>;
}
