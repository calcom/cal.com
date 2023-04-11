import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { AuthOptions, Session } from "next-auth";

import { AUTH_OPTIONS } from "./next-auth-options";

export async function getServerSession(options: {
  req: NextApiRequest | GetServerSidePropsContext["req"];
  res: NextApiResponse | GetServerSidePropsContext["res"];
  authOptions?: AuthOptions;
}) {
  const { req, res, authOptions = AUTH_OPTIONS } = options;
  const { getServerSession: getServerSessionInner } = await import("next-auth/next");

  const session = await getServerSessionInner(req, res, authOptions);

  // that these are equal are ensured in `[...nextauth]`'s callback
  return session as Session | null;
}
