import process from "node:process";
import { getCspHeader, getCspNonce } from "@lib/csp";
import { verifyOnboardingEmbedVerifiedCookie, ONBOARDING_EMBED_VERIFIED_COOKIE_NAME } from "@lib/onboarding-embed-verified-cookie";
import { get } from "@vercel/edge-config";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const safeGet = async <T = any>(key: string): Promise<T | undefined> => {
  try {
    return get<T>(key);
  } catch (error) {
    // Don't crash if EDGE_CONFIG env var is missing
  }
};

// Vercel/Edge rejects non‑ASCII header values (see: https://github.com/vercel/next.js/issues/85631)
const isAscii = (s: string) => {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0x7f) return false;
  return true;
};
const stripNonAscii = (s: string) => {
  let out = "";
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) <= 0x7f) out += s[i];
  return out;
};
const sanitizeRequestHeaders = (headers: Iterable<[string, string]>): Headers => {
  const out = new Headers();
  for (const [name, raw] of Array.from(headers)) {
    if (!isAscii(name)) continue;
    let value = raw;
    if (!isAscii(value)) {
      // Heuristic: if the string contains common mojibake markers (Ã: 0xC3, Â: 0xC2),
      // prefer a simple strip (avoids introducing spurious ASCII letters like 'A').
      let hasMojibakeMarker = false;
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code === 0xc3 || code === 0xc2) {
          hasMojibakeMarker = true;
          break;
        }
      }

      if (hasMojibakeMarker) {
        value = stripNonAscii(value);
      } else {
        try {
          value = stripNonAscii(value.normalize("NFKD"));
        } catch {
          value = stripNonAscii(value);
        }
      }
    }
    if (value) out.set(name, value);
  }
  return out;
};

const isPagePathRequest = (url: URL) => {
  const isNonPagePathPrefix = /^\/(?:_next|api)\//;
  const isFile = /\..*$/;
  const { pathname } = url;
  return !isNonPagePathPrefix.test(pathname) && !isFile.test(pathname);
};

const shouldEnforceCsp = (url: URL) => {
  return url.pathname.startsWith("/auth/login") || url.pathname.startsWith("/login");
};

const proxy = async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const url = req.nextUrl;
  const reqWithEnrichedHeaders = enrichRequestWithHeaders({ req });
  const requestHeaders = new Headers(reqWithEnrichedHeaders.headers);

  if (url.pathname.startsWith("/api/auth/signup")) {
    const isSignupDisabled = await safeGet<boolean>("isSignupDisabled");
    // If is in maintenance mode, point the url pathname to the maintenance page
    if (isSignupDisabled) {
      // TODO: Consider using responseWithHeaders here
      return NextResponse.json({ error: "Signup is disabled" }, { status: 503 });
    }
  }

  if (url.pathname.startsWith("/apps/installed")) {
    const returnTo = reqWithEnrichedHeaders.cookies.get("return-to");

    if (returnTo?.value) {
      const response = NextResponse.redirect(new URL(returnTo.value, reqWithEnrichedHeaders.url), {
        headers: requestHeaders,
      });
      response.cookies.delete("return-to");
      return response;
    }
  }

  const res = NextResponse.next({
    request: {
      headers: sanitizeRequestHeaders(requestHeaders),
    },
  });

  if (url.pathname.startsWith("/auth/logout")) {
    res.cookies.delete("next-auth.session-token");
  }

  return await responseWithHeaders({ url, res, req: reqWithEnrichedHeaders });
};

const embeds = {
  addResponseHeaders: ({ url, res }: { url: URL; res: NextResponse }) => {
    if (!url.pathname.endsWith("/embed")) {
      return res;
    }
    const isCOEPEnabled = url.searchParams.get("flag.coep") === "true";
    if (isCOEPEnabled) {
      res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    }

    const embedColorScheme = url.searchParams.get("ui.color-scheme");
    if (embedColorScheme) {
      res.headers.set("x-embedColorScheme", embedColorScheme);
    }

    res.headers.set("x-isEmbed", "true");
    return res;
  },
};

const contentSecurityPolicy = {
  addResponseHeaders: ({ res, req }: { res: NextResponse; req: NextRequest }) => {
    const nonce = req.headers.get("x-csp-nonce");
    if (!nonce) {
      res.headers.set("x-csp-status", "not-opted-in");
      return res;
    }
    const cspHeader = getCspHeader({ shouldEnforceCsp: shouldEnforceCsp(req.nextUrl), nonce });
    if (cspHeader) {
      res.headers.set(cspHeader.name, cspHeader.value);
    }
    return res;
  },
  addRequestHeaders: ({ req }: { req: NextRequest }) => {
    if (!process.env.CSP_POLICY) {
      return req;
    }
    const isCspApplicable = isPagePathRequest(req.nextUrl);
    if (!isCspApplicable) {
      return req;
    }
    const nonce = getCspNonce();
    req.headers.set("x-csp-nonce", nonce);
    return req;
  },
};

const onboardingEmbed = {
  addResponseHeaders: ({ res, trustedOrigin }: { res: NextResponse; trustedOrigin: string }) => {
    const existing = res.headers.get("Content-Security-Policy") || "";
    if (existing.includes("frame-ancestors")) return res;
    const separator = existing ? "; " : "";
    res.headers.set("Content-Security-Policy", `${existing}${separator}frame-ancestors ${trustedOrigin}`);
    return res;
  },
};

function isOnboardingEmbedRequest(url: URL): boolean {
  const { searchParams } = url;
  return (
    searchParams.get("onboardingEmbed") === "true" &&
    !!searchParams.get("client_id") &&
    !!searchParams.get("redirect_uri") &&
    !!searchParams.get("scope") &&
    !!searchParams.get("state")
  );
}

async function responseWithHeaders({ url, res, req }: { url: URL; res: NextResponse; req: NextRequest }) {
  const resWithCSP = contentSecurityPolicy.addResponseHeaders({ res, req });
  const resWithEmbeds = embeds.addResponseHeaders({ url, res: resWithCSP });

  const onboardingEmbedCookie = req.cookies.get(ONBOARDING_EMBED_VERIFIED_COOKIE_NAME)?.value;
  if (onboardingEmbedCookie && isOnboardingEmbedRequest(url)) {
    const trustedOrigin = await verifyOnboardingEmbedVerifiedCookie(onboardingEmbedCookie);
    if (trustedOrigin) {
      return onboardingEmbed.addResponseHeaders({ res: resWithEmbeds, trustedOrigin });
    }
  }

  return resWithEmbeds;
}

function enrichRequestWithHeaders({ req }: { req: NextRequest }) {
  const reqWithCSP = contentSecurityPolicy.addRequestHeaders({ req });
  return reqWithCSP;
}

export const config = {
  matcher: ["/auth/login", "/login", "/apps/installed", "/auth/logout", "/:path*/embed", "/availability", "/api/auth/signup", "/onboarding/:path*", "/auth/oauth2/authorize", "/signup"],
};

export default proxy;
