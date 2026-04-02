"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function useRedirectToLoginIfUnauthenticated(isPublic = false) {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const router = useRouter();
  useEffect(() => {
    if (isPublic) {
      return;
    }

    if (!loading && !session) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.set("callbackUrl", `${WEBAPP_URL}${location.pathname}${location.search}`);
      router.replace(`/auth/login?${urlSearchParams.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, isPublic]);

  return {
    loading: loading && !session,
    session,
  };
}
