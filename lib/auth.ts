import { compare, hash } from "bcryptjs";
import { IncomingMessage } from "http";
import { NextApiRequest, NextApiResponse } from "next";
import { DefaultSession } from "next-auth";
import { getSession as getSessionInner, GetSessionOptions } from "next-auth/client";
import { Subject } from "./platform/authorization/Subject";
import { SubjectResolver } from "./platform/authorization/SubjectResolver";
import { SubjectType } from "./platform/authorization/SubjectType";
import { UserSubject } from "./platform/authorization/UserSubject";

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

/**
 * Utility method to initialize and invoke the subject resolver.
 */
export async function getSubject(request: IncomingMessage): Promise<Subject> {
  const resolver = new SubjectResolver();
  return resolver.resolve(request);
}

export type RequestHandler = (req: NextApiRequest, res: NextApiResponse) => void;

export type UserSubjectRequestHandler = (
  subject: UserSubject,
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void>;

/**
 * Interceptor that requires the resolved subject to be a user.
 */
export function requireUserSubject(handler: UserSubjectRequestHandler): RequestHandler {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    const subject = await getSubject(req);
    if (subject.type !== SubjectType.User) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    return handler(subject, req, res);
  };
}
