import { parse } from "accept-language-parser";
import type { GetTokenParams } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";

/**
 * This is a slimmed down version of the `getServerSession` function from
 * `next-auth`.
 *
 * Instead of requiring the entire options object for NextAuth, we create
 * a compatible session using information from the incoming token.
 *
 * The downside to this is that we won't refresh sessions if the users
 * token has expired (30 days). This should be fine as we call `/auth/session`
 * frequently enough on the client-side to keep the session alive.
 */
export const getLocale = async (req: GetTokenParams["req"]): Promise<string> => {
  const token = await getToken({
    req,
  });

  const tokenLocale = token?.["locale"];

  if (tokenLocale !== undefined) {
    return tokenLocale;
  }

  const acceptLanguage =
    req.headers instanceof Headers ? req.headers.get("accept-language") : req.headers["accept-language"];

  const languages = acceptLanguage ? parse(acceptLanguage) : [];

  return languages[0]?.code ?? "en";
};
