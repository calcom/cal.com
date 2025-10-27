import type { TFunction } from "i18next";

export type OrganizationCreation = {
  language: TFunction;
  from: string;
  to: string;
  ownerNewUsername: string;
  ownerOldUsername: string | null;
  orgDomain: string;
  orgName: string;
  prevLink: string | null;
  newLink: string;
};

export type EmailVerifyCode = {
  language: TFunction;
  user: {
    name?: string | null;
    email: string;
  };
  verificationEmailCode: string;
  isVerifyingEmail?: boolean;
};
