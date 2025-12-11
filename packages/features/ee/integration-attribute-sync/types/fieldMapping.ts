export interface FieldMapping {
  id?: string; // Optional - only for existing mappings
  integrationFieldName: string; // Integration field name (user types this)
  attributeId: string; // Cal.com attribute ID
  enabled: boolean;
}

export interface FieldMappingFormState {
  mappings: FieldMapping[];
}
