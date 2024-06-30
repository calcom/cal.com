import { parse } from "accept-language-parser";
import { lookup } from "bcp-47-match";
import type { GetTokenParams } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { type ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

//@ts-expect-error no type definitions
import { i18n } from "@calcom/config/next-i18next.config";

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
export const getLocale = async (
  req:
    | GetTokenParams["req"]
    | {
        cookies: ReadonlyRequestCookies;
        headers: ReadonlyHeaders;
      }
): Promise<string> => {
  const token = await getToken({
    req: req as GetTokenParams["req"],
  });

  const tokenLocale = token?.["locale"];

  if (tokenLocale) {
    return tokenLocale;
  }

  const acceptLanguage =
    req.headers instanceof Headers ? req.headers.get("accept-language") : req.headers["accept-language"];

  const languages = acceptLanguage ? parse(acceptLanguage) : [];

  const code: string = languages[0]?.code ?? "";
  const region: string = languages[0]?.region ?? "";

  // the code should consist of 2 or 3 lowercase letters
  // the regex underneath is more permissive
  const testedCode = /^[a-zA-Z]+$/.test(code) ? code : "en";

  // the code should consist of either 2 uppercase letters or 3 digits
  // the regex underneath is more permissive
  const testedRegion = /^[a-zA-Z0-9]+$/.test(region) ? region : "";

  const requestedLocale = `${testedCode}${testedRegion !== "" ? "-" : ""}${testedRegion}`;

  // use fallback to closest supported locale.
  // for instance, es-419 will be transformed to es
  return lookup(i18n.locales, requestedLocale) ?? requestedLocale;
};
