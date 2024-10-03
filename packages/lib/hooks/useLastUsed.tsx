import { useState, useEffect } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localStorage } from "@calcom/lib/webstorage";

type LoginType = "saml" | "google" | "credentials";

export function useLastUsed() {
  const [lastUsed, setLastUsed] = useState<LoginType>();

  useEffect(() => {
    const storedValue = localStorage.getItem("last_cal_login");
    if (storedValue) {
      setLastUsed(storedValue as LoginType);
    }
  }, []);

  useEffect(() => {
    if (lastUsed) {
      localStorage.setItem("last_cal_login", lastUsed);
    } else {
      localStorage.removeItem("last_cal_login");
    }
  }, [lastUsed]);

  return [lastUsed, setLastUsed] as const;
}

export const LastUsed = ({ className }: { className?: string }) => {
  const { t } = useLocale();
  return (
    <span className={classNames("text-subtle absolute right-3 text-xs", className)}>{t("last_used")}</span>
  );
};
