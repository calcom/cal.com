import type { IAttributeSyncRule } from "../schemas/zod";

export enum AttributeSyncIntegrations {
  SALESFORCE = "salesforce",
}

export interface IntegrationAttributeSync {
  id: string;
  integration: AttributeSyncIntegrations;
  credentialId?: number;
  enabled: boolean;
  attributeSyncRules: AttributeSyncRule[];
  syncFieldMappings: AttributeSyncFieldMapping[];
}

export interface AttributeSyncRule {
  id: string;
  rule: IAttributeSyncRule;
}

export interface AttributeSyncFieldMapping {
  id: string;
  integrationFieldName: string;
  attributeId: string;
  enabled: boolean;
}

export interface IIntegrationAttributeSyncRepository {
  getByOrganizationId(organizationId: number): IntegrationAttributeSync[];
  getById(id: string): IntegrationAttributeSync;
  getSyncFieldMappings(integrationAttributeSyncId: string): Promise<AttributeSyncFieldMapping[]>;
  updateTransactionWithRuleAndMappings(
    params: IIntegrationAttributeSyncUpdateParams
  ): Promise<IntegrationAttributeSync>;
  delete(id: string): Promise<void>;
}

export interface IIntegrationAttributeSyncUpdateParams {
  integrationAttributeSync: IntegrationAttributeSync;
  attributeSyncRule: AttributeSyncRule;
  syncFieldMappings: AttributeSyncFieldMapping;
}
