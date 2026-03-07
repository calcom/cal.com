import type {
  CreateManagedOrganizationOutput,
  CreateOrganizationInput,
  GetManagedOrganizationOutput,
  GetManagedOrganizationsOutput,
  ManagedOrganizationOutput,
  ManagedOrganizationWithApiKeyOutput,
  UpdateOrganizationInput,
} from "../../generated/types.gen";

export type ManagedOrg = ManagedOrganizationOutput;
export type ManagedOrgWithApiKey = ManagedOrganizationWithApiKeyOutput;
export type ManagedOrgList = GetManagedOrganizationsOutput["data"];
export type ManagedOrgResponse = GetManagedOrganizationOutput["data"];
export type ManagedOrgCreateResponse = CreateManagedOrganizationOutput["data"];

export type { CreateOrganizationInput, UpdateOrganizationInput };
