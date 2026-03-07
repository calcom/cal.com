import type {
  CreateOrganizationUserInput,
  GetOrganizationUserOutput,
  GetOrganizationUsersResponseDTO,
  GetOrgUsersWithProfileOutput,
  UpdateOrganizationUserInput,
} from "../../generated/types.gen";

export type OrgUser = GetOrgUsersWithProfileOutput;
export type OrgUserList = GetOrganizationUsersResponseDTO["data"];
export type OrgUserResponse = GetOrganizationUserOutput["data"];

export type { CreateOrganizationUserInput, UpdateOrganizationUserInput };
