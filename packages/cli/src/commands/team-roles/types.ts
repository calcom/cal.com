import type {
  CreateTeamRoleOutput,
  DeleteTeamRoleOutput,
  GetAllTeamRolesOutput,
  GetTeamRoleOutput,
  GetTeamRolePermissionsOutput,
  TeamRoleOutput,
  UpdateTeamRoleOutput,
} from "../../generated/types.gen";

export type TeamRole = TeamRoleOutput;
export type TeamRoleList = GetAllTeamRolesOutput["data"];
export type TeamRoleCreateResponse = CreateTeamRoleOutput["data"];
export type TeamRoleGetResponse = GetTeamRoleOutput["data"];
export type TeamRoleUpdateResponse = UpdateTeamRoleOutput["data"];
export type TeamRoleDeleteResponse = DeleteTeamRoleOutput["data"];
export type TeamRolePermissionsList = GetTeamRolePermissionsOutput["data"];
