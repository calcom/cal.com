import { compare, hash } from "bcryptjs";
import { DefaultSession } from "next-auth";
import { getSession as getSessionInner, GetSessionOptions } from "next-auth/client";

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
