import type {
  CreateTeamMembershipOutput,
  CreateTeamOutput,
  GetTeamsOutput,
  TeamMembershipOutput,
  TeamOutputDto,
  UpdateTeamMembershipOutput,
  UpdateTeamOutput,
} from "../../generated/types.gen";

export type Team = TeamOutputDto;
export type TeamList = GetTeamsOutput["data"];
export type TeamCreateResponse = CreateTeamOutput["data"];
export type TeamUpdateResponse = UpdateTeamOutput["data"];
export type TeamMembership = TeamMembershipOutput;
// Note: API spec incorrectly shows single object, but endpoint returns array
export type TeamMembershipList = TeamMembershipOutput[];
export type TeamMembershipCreateResponse = CreateTeamMembershipOutput["data"];
export type TeamMembershipUpdateResponse = UpdateTeamMembershipOutput["data"];
