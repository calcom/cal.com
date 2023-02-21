import { IdentityProvider } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import type { Session } from "next-auth";
import type { GetSessionParams } from "next-auth/react";
import { getSession as getSessionInner } from "next-auth/react";

/** @deprecated use the one from `@calcom/lib/auth` */
export async function hashPassword(password: string) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}
/** @deprecated use the one from `@calcom/lib/auth` */
export async function verifyPassword(password: string, hashedPassword: string) {
  const isValid = await compare(password, hashedPassword);
  return isValid;
}
/** @deprecated use the one from `@calcom/lib/auth` */
export async function getSession(options: GetSessionParams): Promise<Session | null> {
  const session = await getSessionInner(options);

  // that these are equal are ensured in `[...nextauth]`'s callback
  return session as Session | null;
}
/** @deprecated use the one from `@calcom/lib/auth` */
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
  RateLimitExceeded = "rate-limit-exceeded",
  InvalidPassword = "invalid-password",
}
/** @deprecated use the one from `@calcom/lib/auth` */
export const identityProviderNameMap: { [key in IdentityProvider]: string } = {
  [IdentityProvider.CAL]: "Cal",
  [IdentityProvider.GOOGLE]: "Google",
  [IdentityProvider.SAML]: "SAML",
};
