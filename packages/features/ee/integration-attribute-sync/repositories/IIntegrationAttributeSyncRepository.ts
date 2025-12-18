import type { IAttributeSyncRule } from "../schemas/zod";

export enum AttributeSyncIntegrations {
  SALESFORCE = "salesforce",
}

export interface IntegrationAttributeSync {
  id: string;
  organizationId: number;
  name: string;
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

export interface IIntegrationAttributeSyncCreateParams {
  name: string;
  organizationId: number;
  integration: string;
  credentialId: number;
  enabled: boolean;
  rule: IAttributeSyncRule;
  syncFieldMappings: Omit<AttributeSyncFieldMapping, "id">[];
}

export interface IIntegrationAttributeSyncRepository {
  getByOrganizationId(organizationId: number): Promise<IntegrationAttributeSync[]>;
  getById(id: string): Promise<IntegrationAttributeSync | null>;
  getSyncFieldMappings(integrationAttributeSyncId: string): Promise<AttributeSyncFieldMapping[]>;
  create(params: IIntegrationAttributeSyncCreateParams): Promise<IntegrationAttributeSync>;
  updateTransactionWithRuleAndMappings(params: IIntegrationAttributeSyncUpdateParams): Promise<void>;
  deleteById(id: string): Promise<void>;
}

export interface IIntegrationAttributeSyncUpdateParams {
  integrationAttributeSync: Omit<
    IntegrationAttributeSync,
    "attributeSyncRules" | "syncFieldMappings" | "integration"
  >;
  attributeSyncRule: AttributeSyncRule;
  fieldMappingsToCreate: Omit<AttributeSyncFieldMapping, "id">[];
  fieldMappingsToUpdate: AttributeSyncFieldMapping[];
  fieldMappingsToDelete: string[];
}
