export enum AttributeSyncIntegrations {
  SALESFORCE = "salesforce",
}

export enum RuleOperatorEnum {
  AND = "AND",
  OR = "OR",
}

export enum ConditionIdentifierEnum {
  TEAM_ID = "teamId",
  ATTRIBUTE_ID = "attributeId",
}

export enum ConditionOperatorEnum {
  EQUALS = "equals",
  NOT_EQUALS = "notEquals",
  IN = "in",
  NOT_IN = "notIn",
}

// Condition types
export interface ITeamCondition {
  identifier: ConditionIdentifierEnum.TEAM_ID;
  operator: ConditionOperatorEnum;
  value: number[];
}

export interface IAttributeCondition {
  identifier: ConditionIdentifierEnum.ATTRIBUTE_ID;
  operator: ConditionOperatorEnum;
  attributeId: string;
  value: string[];
}

export type TAttributeSyncRuleCondition = ITeamCondition | IAttributeCondition;

export interface IAttributeSyncRule {
  operator: RuleOperatorEnum;
  conditions: TAttributeSyncRuleCondition[];
}

// Field mapping types
export interface INewFieldMapping {
  integrationFieldName: string;
  attributeId: string;
  enabled: boolean;
}

export interface IFieldMapping extends INewFieldMapping {
  id: string;
}

export interface IFieldMappingWithOptionalId extends INewFieldMapping {
  id?: string;
}

export interface IFieldMappingFormState {
  mappings: IFieldMappingWithOptionalId[];
}

export interface ISyncFormData {
  id: string;
  name: string;
  credentialId?: number;
  enabled: boolean;
  organizationId: number;
  ruleId: string;
  rule: IAttributeSyncRule;
  syncFieldMappings: (IFieldMapping | INewFieldMapping)[];
}
export interface IntegrationAttributeSync {
  id: string;
  organizationId: number;
  name: string;
  integration: AttributeSyncIntegrations;
  credentialId?: number;
  enabled: boolean;
  attributeSyncRule: AttributeSyncRule | null;
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
  integration: AttributeSyncIntegrations;
  credentialId: number;
  enabled: boolean;
  rule: IAttributeSyncRule;
  syncFieldMappings: Omit<AttributeSyncFieldMapping, "id">[];
}

// TRPC schema types
export interface ICreateAttributeSyncInput {
  name: string;
  credentialId: number;
  rule: IAttributeSyncRule;
  syncFieldMappings: INewFieldMapping[];
  enabled: boolean;
}

export interface IUpdateAttributeSyncInput {
  id: string;
  name: string;
  credentialId?: number;
  enabled: boolean;
  organizationId: number;
  ruleId: string;
  rule: IAttributeSyncRule;
  syncFieldMappings: IFieldMappingWithOptionalId[];
}

export interface IIntegrationAttributeSyncRepository {
  getByOrganizationId(organizationId: number): Promise<IntegrationAttributeSync[]>;
  getById(id: string): Promise<IntegrationAttributeSync | null>;
  getSyncFieldMappings(integrationAttributeSyncId: string): Promise<AttributeSyncFieldMapping[]>;
  getMappedAttributeIdsByOrganization(organizationId: number, excludeSyncId?: string): Promise<string[]>;
  getAttributeIdsByOrganization(organizationId: number, attributeIds: string[]): Promise<string[]>;
  create(params: IIntegrationAttributeSyncCreateParams): Promise<IntegrationAttributeSync>;
  updateTransactionWithRuleAndMappings(params: IIntegrationAttributeSyncUpdateParams): Promise<void>;
  deleteById(id: string): Promise<void>;
  getAllByCredentialId(credentialId: number): Promise<IntegrationAttributeSync[]>;
}

export interface IIntegrationAttributeSyncUpdateParams {
  integrationAttributeSync: Omit<
    IntegrationAttributeSync,
    "attributeSyncRule" | "syncFieldMappings" | "integration"
  >;
  attributeSyncRule: AttributeSyncRule;
  fieldMappingsToCreate: Omit<AttributeSyncFieldMapping, "id">[];
  fieldMappingsToUpdate: AttributeSyncFieldMapping[];
  fieldMappingsToDelete: string[];
}
