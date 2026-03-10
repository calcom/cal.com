import type {
  TeamVerifiedEmailOutputData,
  TeamVerifiedEmailsOutput,
  TeamVerifiedPhoneOutputData,
  TeamVerifiedPhonesOutput,
} from "../../generated/types.gen";

export type TeamVerifiedEmail = TeamVerifiedEmailOutputData;
export type TeamVerifiedEmailsResponse = TeamVerifiedEmailsOutput["data"];
export type TeamVerifiedPhone = TeamVerifiedPhoneOutputData;
export type TeamVerifiedPhonesResponse = TeamVerifiedPhonesOutput["data"];
