import { IdentityProvider } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { Session } from "next-auth";
import { getSession as getSessionInner, GetSessionParams } from "next-auth/react";

export async function hashPassword(password: string) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}

export async function verifyPassword(password: string, hashedPassword: string) {
  const isValid = await compare(password, hashedPassword);
  return isValid;
}

export async function getSession(options: GetSessionParams): Promise<Session | null> {
  const session = await getSessionInner(options);

  // that these are equal are ensured in `[...nextauth]`'s callback
  return session as Session | null;
}

export enum ErrorCode {
  UserNotFound = "user-not-found",
  IncorrectPassword = "incorrect-password",
  UserMissingPassword = "missing-password",
  TwoFactorDisabled = "two-factor-disabled",
  TwoFactorAlreadyEnabled = "two-factor-already-enabled",
  TwoFactorSetupRequired = "two-factor-setup-required",
  SecondFactorRequired = "second-factor-required",
  IncorrectTwoFactorCode = "incorrect-two-factor-code",
  InternalServerError = "internal-server-error",
  NewPasswordMatchesOld = "new-password-matches-old",
  ThirdPartyIdentityProviderEnabled = "third-party-identity-provider-enabled",
}

export const identityProviderNameMap: { [key in IdentityProvider]: string } = {
  [IdentityProvider.CAL]: "Cal",
  [IdentityProvider.GOOGLE]: "Google",
  [IdentityProvider.SAML]: "SAML",
};
