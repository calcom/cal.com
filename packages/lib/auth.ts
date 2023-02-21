import { IdentityProvider } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import type { NextApiRequest } from "next";
import type { Session } from "next-auth";
import type { GetSessionParams } from "next-auth/react";
import { getSession as getSessionInner } from "next-auth/react";

import { HttpError } from "@calcom/lib/http-error";

export async function hashPassword(password: string) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}

export async function verifyPassword(password: string, hashedPassword: string) {
  const isValid = await compare(password, hashedPassword);
  return isValid;
}

export function validPassword(password: string) {
  if (password.length < 7) return false;

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) return false;

  if (!/\d+/.test(password)) return false;

  return true;
}

export async function getSession(options: GetSessionParams): Promise<Session | null> {
  const session = await getSessionInner(options);

  // that these are equal are ensured in `[...nextauth]`'s callback
  return session as Session | null;
}

export function isPasswordValid(password: string): boolean;
export function isPasswordValid(
  password: string,
  breakdown: boolean,
  strict?: boolean
): { caplow: boolean; num: boolean; min: boolean; admin_min: boolean };
export function isPasswordValid(password: string, breakdown?: boolean, strict?: boolean) {
  let cap = false, // Has uppercase characters
    low = false, // Has lowercase characters
    num = false, // At least one number
    min = false, // Eight characters, or fifteen in strict mode.
    admin_min = false;
  if (password.length > 7 && (!strict || password.length > 14)) min = true;
  if (strict && password.length > 14) admin_min = true;
  for (let i = 0; i < password.length; i++) {
    if (!isNaN(parseInt(password[i]))) num = true;
    else {
      if (password[i] === password[i].toUpperCase()) cap = true;
      if (password[i] === password[i].toLowerCase()) low = true;
    }
  }

  if (!breakdown) return cap && low && num && min && (strict ? admin_min : true);

  let errors: Record<string, boolean> = { caplow: cap && low, num, min };
  // Only return the admin key if strict mode is enabled.
  if (strict) errors = { ...errors, admin_min };

  return errors;
}

type CtxOrReq = { req: NextApiRequest; ctx?: never } | { ctx: { req: NextApiRequest }; req?: never };

export const ensureSession = async (ctxOrReq: CtxOrReq) => {
  const session = await getSession(ctxOrReq);
  if (!session?.user.id) throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  return session;
};

export enum ErrorCode {
  IncorrectUsernamePassword = "incorrect-username-password",
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
  SocialIdentityProviderRequired = "social-identity-provider-required",
}

export const identityProviderNameMap: { [key in IdentityProvider]: string } = {
  [IdentityProvider.CAL]: "Cal",
  [IdentityProvider.GOOGLE]: "Google",
  [IdentityProvider.SAML]: "SAML",
};
