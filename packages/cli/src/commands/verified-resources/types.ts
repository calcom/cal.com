import type {
  UserVerifiedEmailOutput,
  UserVerifiedEmailOutputData,
  UserVerifiedEmailsOutput,
  UserVerifiedPhoneOutput,
  UserVerifiedPhoneOutputData,
  UserVerifiedPhonesOutput,
} from "../../generated/types.gen";

export type VerifiedEmailResponse = UserVerifiedEmailOutput;
export type VerifiedEmailData = UserVerifiedEmailOutputData;
export type VerifiedEmailsResponse = UserVerifiedEmailsOutput;
export type VerifiedEmailListData = UserVerifiedEmailsOutput["data"];

export type VerifiedPhoneResponse = UserVerifiedPhoneOutput;
export type VerifiedPhoneData = UserVerifiedPhoneOutputData;
export type VerifiedPhonesResponse = UserVerifiedPhonesOutput;
export type VerifiedPhoneListData = UserVerifiedPhonesOutput["data"];
