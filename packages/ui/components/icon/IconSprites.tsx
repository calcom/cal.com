/* eslint-disable turbo/no-undeclared-env-vars */
import SVG from "react-inlinesvg";

// Use globalThis.process?.env or fallback to empty string for browser safety
const CALCOM_VERSION =
  typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_CALCOM_VERSION
    ? process.env.NEXT_PUBLIC_CALCOM_VERSION
    : "";
const VERCEL_COMMIT_SHA =
  typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    : "";

const commitHash = VERCEL_COMMIT_SHA ? `-${VERCEL_COMMIT_SHA.slice(0, 7)}` : "";

export function IconSprites() {
  const WEBAPP_URL =
    (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_WEBAPP_URL) || "";
  // Build URL robustly, avoid double slashes, and default to same-origin when WEBAPP_URL is unset.
  const base = WEBAPP_URL.replace(/\/+$/, "");
  const path = "/icons/sprite.svg";
  const src = `${base}${path}?v=${CALCOM_VERSION}${commitHash}`.replace(/([^:]\/)\/+/g, "$1");
  return <SVG src={src} />;
}

export default IconSprites;
