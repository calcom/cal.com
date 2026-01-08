import process from "node:process";
import type { JSX } from "react";

import SVG from "react-inlinesvg";

const vercelCommitHash: string | undefined = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

function getCommitHash(): string {
  if (vercelCommitHash) {
    return `-${vercelCommitHash.slice(0, 7)}`;
  }
  return "";
}

const commitHash: string = getCommitHash();

export function IconSprites(): JSX.Element {
  return (
    <SVG
      src={`/icons/sprite.svg?v=${process.env.NEXT_PUBLIC_CALCOM_VERSION}${commitHash}`}
    />
  );
}

export default IconSprites;
