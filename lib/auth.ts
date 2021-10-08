import { compare, hash } from "bcryptjs";
import { NextApiRequest } from "next";
import { DefaultSession } from "next-auth";
import { getSession as getSessionInner, GetSessionOptions } from "next-auth/client";
import { getToken } from "next-auth/jwt";

export async function hashPassword(password: string) {
  const hashedPassword = await hash(password, 12);
  return hashedPassword;
}

export async function verifyPassword(password: string, hashedPassword: string) {
  const isValid = await compare(password, hashedPassword);
  return isValid;
}

type DefaultSessionUser = NonNullable<DefaultSession["user"]>;
type CalendsoSessionUser = DefaultSessionUser & {
  id: number;
  username: string;
};
export interface Session extends DefaultSession {
  user?: CalendsoSessionUser;
}

export async function getSession(options: GetSessionOptions): Promise<Session | null> {
  const session = await getSessionInner(options);

  // that these are equal are ensured in `[...nextauth]`'s callback
  return session as Session | null;
}

// Temporary auth using either token or cookie.
export async function getUserIdFromTokenOrCookie(options: GetSessionOptions): Promise<number | null> {
  let userId = null;
  const token = await getToken({ req: options.req as NextApiRequest, secret: process.env.JWT_SECRET });
  if (token && token.id) {
    userId = token.id as number;
  } else {
    const session = await getSession(options);
    if (!session || !session.user) {
      return null;
    }
    userId = session.user?.id;
  }
  return userId;
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
}
