"use client";

import { EXP_OVERRIDE_PREFIX } from "@calcom/features/experiments/config";
import { sessionStorage } from "@calcom/lib/webstorage";
import { useState } from "react";

export function useActiveOverrides() {
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const result: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(EXP_OVERRIDE_PREFIX)) {
        const slug = key.slice(EXP_OVERRIDE_PREFIX.length);
        const value = sessionStorage.getItem(key);
        if (value !== null) result[slug] = value;
      }
    }
    return result;
  });

  const setOverride = (slug: string, variant: string) => {
    sessionStorage.setItem(`${EXP_OVERRIDE_PREFIX}${slug}`, variant);
    setOverrides((prev) => ({ ...prev, [slug]: variant }));
  };

  const clearOverride = (slug: string) => {
    sessionStorage.removeItem(`${EXP_OVERRIDE_PREFIX}${slug}`);
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  };

  const clearAll = () => {
    Object.keys(overrides).forEach((slug) => {
      sessionStorage.removeItem(`${EXP_OVERRIDE_PREFIX}${slug}`);
    });
    setOverrides({});
  };

  return { overrides, setOverride, clearOverride, clearAll };
}
