import type {
  CreateOrgRoleOutput,
  DeleteOrgRoleOutput,
  GetAllOrgRolesOutput,
  GetOrgRoleOutput,
  GetOrgRolePermissionsOutput,
  OrgRoleOutput,
  UpdateOrgRoleOutput,
} from "../../generated/types.gen";

export type OrgRole = OrgRoleOutput;
export type OrgRoleList = GetAllOrgRolesOutput["data"];
export type OrgRoleCreateResponse = CreateOrgRoleOutput["data"];
export type OrgRoleGetResponse = GetOrgRoleOutput["data"];
export type OrgRoleUpdateResponse = UpdateOrgRoleOutput["data"];
export type OrgRoleDeleteResponse = DeleteOrgRoleOutput["data"];
export type OrgRolePermissionsList = GetOrgRolePermissionsOutput["data"];
