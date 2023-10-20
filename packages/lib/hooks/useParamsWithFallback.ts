"use client";

import { RouterContext } from "next/dist/shared/lib/router-context";
import { useParams } from "next/navigation";
import { useContext } from "react";

interface Params {
  [key: string]: string | string[];
}

/**
 * This hook is a workaround until pages are migrated to app directory.
 */
export function useParamsWithFallback(): Params {
  const params = useParams();
  // `Error: NextRouter was not mounted` is thrown if `useRouter` from `next/router` is called in App router.
  // As can be seen in https://github.com/vercel/next.js/blob/e8a92a9507cff7d5f7b52701089d4b8141126a63/packages/next/src/client/router.ts#L132,
  // `useRouter()` hook returns `React.useContext(RouterContext)`.
  // Hence, We can directly use this value.
  const router = useContext(RouterContext);
  if (router) {
    return (router.query ?? {}) as Params;
  }
  return params ?? {};
}
