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
