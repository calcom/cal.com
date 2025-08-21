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
  return <SVG src={`https://app.cal.com/icons/sprite.svg?v=${CALCOM_VERSION}${commitHash}`} />;
}

export default IconSprites;
