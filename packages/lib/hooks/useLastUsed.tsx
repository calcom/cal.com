import { useState, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";

type LoginType = "saml" | "google" | "credentials" | undefined;

export function useLastUsed() {
  const [lastUsed, setLastUsed] = useState<LoginType>(() => {
    const storedValue = localStorage.getItem("last_cal_login");
    return storedValue ? (storedValue as LoginType) : undefined;
  });

  useEffect(() => {
    if (lastUsed) {
      localStorage.setItem("last_cal_login", lastUsed);
    } else {
      localStorage.removeItem("last_cal_login");
    }
  }, [lastUsed]);

  return [lastUsed, setLastUsed] as const;
}

export const LastUsed = () => {
  const { t } = useLocale();
  return <span className="text-subtle absolute right-3 text-xs">{t("last_used")}</span>;
};
