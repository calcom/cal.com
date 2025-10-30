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

export type PendingGuestConfirmation = {
  language: TFunction;
  guest: {
    email: string;
    name?: string;
  };
  booking: {
    uid: string;
    title: string;
  };
  organizer: {
    name: string;
    email: string;
  };
};
