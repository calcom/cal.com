import type {
  CreateOrgMembershipOutput,
  DeleteOrgMembership,
  GetAllOrgMemberships,
  GetOrgMembership,
  OrganizationMembershipOutput,
  UpdateOrgMembership,
} from "../../generated/types.gen";

export type OrgMembership = OrganizationMembershipOutput;
export type OrgMembershipList = OrganizationMembershipOutput[];
export type OrgMembershipListResponse = GetAllOrgMemberships["data"];
export type OrgMembershipGetResponse = GetOrgMembership["data"];
export type OrgMembershipCreateResponse = CreateOrgMembershipOutput["data"];
export type OrgMembershipUpdateResponse = UpdateOrgMembership["data"];
export type OrgMembershipDeleteResponse = DeleteOrgMembership["data"];
