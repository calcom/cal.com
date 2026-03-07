import type {
  RequestEmailVerificationOutput,
  RequestPhoneVerificationOutput,
  TeamVerifiedEmailOutput,
  TeamVerifiedEmailOutputData,
  TeamVerifiedEmailsOutput,
  TeamVerifiedPhoneOutput,
  TeamVerifiedPhoneOutputData,
  TeamVerifiedPhonesOutput,
} from "../../generated/types.gen";

export type VerifiedEmailResponse = TeamVerifiedEmailOutput;
export type VerifiedEmailData = TeamVerifiedEmailOutputData;
export type VerifiedEmailsResponse = TeamVerifiedEmailsOutput;
export type VerifiedEmailListData = TeamVerifiedEmailsOutput["data"];

export type VerifiedPhoneResponse = TeamVerifiedPhoneOutput;
export type VerifiedPhoneData = TeamVerifiedPhoneOutputData;
export type VerifiedPhonesResponse = TeamVerifiedPhonesOutput;
export type VerifiedPhoneListData = TeamVerifiedPhonesOutput["data"];

export type RequestEmailCodeResponse = RequestEmailVerificationOutput;
export type RequestPhoneCodeResponse = RequestPhoneVerificationOutput;
