"use client";

import { useParams } from "next/navigation";
import { useRouter } from "next/router";

/**
 * This hook is a workaround until pages are migrated to app directory.
 */
export function useParamsWithFallback() {
  const router = useRouter();
  const params = useParams();
  return params || router.query;
}
