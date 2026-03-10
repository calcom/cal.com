import type {
  UserVerifiedEmailOutputData,
  UserVerifiedEmailsOutput,
  UserVerifiedPhoneOutputData,
  UserVerifiedPhonesOutput,
} from "../../generated/types.gen";

export type VerifiedEmail = UserVerifiedEmailOutputData;
export type VerifiedEmailsResponse = UserVerifiedEmailsOutput["data"];
export type VerifiedPhone = UserVerifiedPhoneOutputData;
export type VerifiedPhonesResponse = UserVerifiedPhonesOutput["data"];
