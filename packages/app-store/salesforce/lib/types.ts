export interface SalesforceField {
  name: string;
  type: string;
  length?: number;
  picklistValues?: Array<{
    active: boolean;
    value: string;
  }>;
}
