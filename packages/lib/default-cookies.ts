import { CookiesOptions } from "next-auth";

import { isENVDev } from "@calcom/lib/env";

/**
 * Copy from 'https://github.com/nextauthjs/next-auth/blob/227ff2259f/src/core/lib/cookie.ts' as we can't import it directly
 *
 * Use secure cookies if the site uses HTTPS
 * This being conditional allows cookies to work non-HTTPS development URLs
 * Honour secure cookie option, which sets 'secure' and also adds '__Secure-'
 * prefix, but enable them by default if the site URL is HTTPS; but not for
 * non-HTTPS URLs like http://localhost which are used in development).
 * For more on prefixes see https://googlechrome.github.io/samples/cookie-prefixes/
 *
 */

const NEXTAUTH_COOKIE_DOMAIN = process.env.NEXTAUTH_COOKIE_DOMAIN || "";
export function defaultCookies(useSecureCookies: boolean): CookiesOptions {
  const cookiePrefix = useSecureCookies ? "__Secure-" : "";
  // To enable cookies on widgets,
  // https://stackoverflow.com/questions/45094712/iframe-not-reading-cookies-in-chrome
  // But we need to set it as `lax` in development
  const sameSite = isENVDev ? "lax" : "none";
  return {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        domain: isENVDev ? undefined : NEXTAUTH_COOKIE_DOMAIN,
        sameSite,
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        domain: isENVDev ? undefined : NEXTAUTH_COOKIE_DOMAIN,
        sameSite,
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      // Default to __Host- for CSRF token for additional protection if using useSecureCookies
      // NB: The `__Host-` prefix is stricter than the `__Secure-` prefix.
      name: `${cookiePrefix}next-auth.csrf-token`,
      options: {
        domain: isENVDev ? undefined : NEXTAUTH_COOKIE_DOMAIN,
        httpOnly: true,
        sameSite,
        path: "/",
        secure: useSecureCookies,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: {
        domain: isENVDev ? undefined : NEXTAUTH_COOKIE_DOMAIN,
        httpOnly: true,
        sameSite,
        path: "/",
        secure: useSecureCookies,
      },
    },
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        domain: isENVDev ? undefined : NEXTAUTH_COOKIE_DOMAIN,
        httpOnly: true,
        sameSite,
        path: "/",
        secure: useSecureCookies,
      },
    },
  };
}
