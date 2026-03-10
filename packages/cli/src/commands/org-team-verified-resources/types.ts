import type {
  TeamVerifiedEmailOutputData,
  TeamVerifiedEmailsOutput,
  TeamVerifiedPhoneOutputData,
  TeamVerifiedPhonesOutput,
} from "../../generated/types.gen";

export type OrgTeamVerifiedEmail = TeamVerifiedEmailOutputData;
export type OrgTeamVerifiedEmailsResponse = TeamVerifiedEmailsOutput["data"];
export type OrgTeamVerifiedPhone = TeamVerifiedPhoneOutputData;
export type OrgTeamVerifiedPhonesResponse = TeamVerifiedPhonesOutput["data"];
