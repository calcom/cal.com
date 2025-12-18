"use client";

import { DubEmbed } from "@dub/embed-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui/components/toast";

const fetchReferralsToken = async () => {
  try {
    const response = await fetch("/api/user/referrals-token");

    if (!response.ok) {
      const { error } = await response.json();
      showToast(error, "error");
      return null;
    }

    const data = await response.json();

    return data.publicToken;
  } catch (error) {
    console.error("Error fetching referrals token:", error);
    return null;
  }
};

// The enabled referrals page implementation
export const DubReferralsPage = () => {
  const [token, setToken] = useState<string | null>(null);
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const getToken = async () => {
      try {
        const publicToken = await fetchReferralsToken();
        setToken(publicToken);
      } catch (err) {
        console.error("Error fetching referrals token:", err);
        showToast(t("unexpected_error_try_again"), "error");
      }
    };

    getToken();
  }, [t]);

  if (!IS_DUB_REFERRALS_ENABLED || !token) {
    return null;
  }

  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <DubEmbed
      data="referrals"
      token={token}
      options={{
        theme,
        themeOptions: {
          backgroundColor: `${theme === "dark" ? "#0F0F0F" : "#FFFFFF"}`,
        },
      }}
    />
  );
};
