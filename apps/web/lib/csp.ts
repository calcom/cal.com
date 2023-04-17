import crypto from "crypto";
import type { IncomingMessage, OutgoingMessage } from "http";
import { z } from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { WEBAPP_URL } from "@calcom/lib/constants";

function getCspPolicy(nonce: string) {
  //TODO: Do we need to explicitly define it in turbo.json
  const CSP_POLICY = process.env.CSP_POLICY;

  // Note: "non-strict" policy only allows inline styles otherwise it's the same as "strict"
  // We can remove 'unsafe-inline' from style-src when we add nonces to all style tags
  // Maybe see how @next-safe/middleware does it if it's supported.
  const useNonStrictPolicy = CSP_POLICY === "non-strict";

  // We add WEBAPP_URL to img-src because of booking pages, which end up loading images from app.cal.com on cal.com
  // FIXME: Write a layer to extract out EventType Analytics tracking endpoints and add them to img-src or connect-src as needed. e.g. fathom, Google Analytics and others
  return `
	  default-src 'self' ${IS_PRODUCTION ? "" : "data:"};
	  script-src ${
      IS_PRODUCTION
        ? // 'self' 'unsafe-inline' https: added for Browsers not supporting strict-dynamic not supporting strict-dynamic
          "'nonce-" + nonce + "' 'strict-dynamic' 'self' 'unsafe-inline' https:"
        : // Note: We could use 'strict-dynamic' with 'nonce-..' instead of unsafe-inline but there are some streaming related scripts that get blocked(because they don't have nonce on them). It causes a really frustrating full page error model by Next.js to show up sometimes
          "'unsafe-inline' 'unsafe-eval' https: http:"
    };
    object-src 'none';
    base-uri 'none';
	  child-src app.cal.com;
	  style-src 'self' ${
      IS_PRODUCTION ? (useNonStrictPolicy ? "'unsafe-inline'" : "") : "'unsafe-inline'"
    } app.cal.com;
	  font-src 'self';
	  img-src 'self' ${WEBAPP_URL} https://www.gravatar.com https://img.youtube.com https://eu.ui-avatars.com/api/ data:;
    connect-src 'self'
	`;
}

// Taken from @next-safe/middleware
const isPagePathRequest = (url: URL) => {
  const isNonPagePathPrefix = /^\/(?:_next|api)\//;
  const isFile = /\..*$/;
  const { pathname } = url;
  return !isNonPagePathPrefix.test(pathname) && !isFile.test(pathname);
};

export function csp(req: IncomingMessage | null, res: OutgoingMessage | null) {
  if (!req) {
    return { nonce: undefined };
  }
  const existingNonce = req.headers["x-nonce"];
  if (existingNonce) {
    const existingNoneParsed = z.string().safeParse(existingNonce);
    return { nonce: existingNoneParsed.success ? existingNoneParsed.data : "" };
  }
  if (!req.url) {
    return { nonce: undefined };
  }
  const CSP_POLICY = process.env.CSP_POLICY;
  const cspEnabledForInstance = CSP_POLICY;
  const nonce = crypto.randomBytes(16).toString("base64");

  const parsedUrl = new URL(req.url, "http://base_url");
  const cspEnabledForPage = cspEnabledForInstance && isPagePathRequest(parsedUrl);
  if (!cspEnabledForPage) {
    return {
      nonce: undefined,
    };
  }
  // Set x-nonce request header to be used by `getServerSideProps` or similar fns and `Document.getInitialProps` to read the nonce from
  // It is generated for all page requests but only used by pages that need CSP
  req.headers["x-nonce"] = nonce;

  if (res) {
    res.setHeader(
      req.headers["x-csp-enforce"] === "true"
        ? "Content-Security-Policy"
        : "Content-Security-Policy-Report-Only",
      getCspPolicy(nonce)
        .replace(/\s{2,}/g, " ")
        .trim()
    );
  }

  return { nonce };
}
