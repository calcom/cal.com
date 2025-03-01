"use client";

import type { TFunction } from "app/_types";
import { getTranslate } from "app/_utils";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export function useLocale() {
  const [t, setT] = useState<TFunction | null>(null);
  const session = useSession();
  useEffect(() => {
    let isMounted = true;
    const loadTranslation = async () => {
      const tFunc = await getTranslate(session.data?.user.locale ?? "en");
      if (isMounted) setT(() => tFunc); // Return function to ensure fresh reference
    };

    loadTranslation().catch((error) => {
      console.error("Failed to load translation:", error);
      if (isMounted) setT(() => (key: string) => key); // Fallback to key
    });

    return () => {
      isMounted = false;
    };
  }, [session.data?.user.locale]);

  const tFunction: TFunction = t || ((key) => key);

  return { t: tFunction, isLocaleReady: !t, language: session.data?.user.locale ?? "en" };
}
