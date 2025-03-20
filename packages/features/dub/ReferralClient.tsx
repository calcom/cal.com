"use client";

import { DubEmbed } from "@dub/embed-react";
import { useTheme } from "next-themes";

import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";

const ReferralClientImpl = ({ publicToken }: { publicToken: string }) => {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <DubEmbed
      data="referrals"
      token={publicToken}
      options={{
        theme,
        themeOptions: {
          backgroundColor: `${theme === "dark" ? "#0F0F0F" : "#FFFFFF"}`,
        },
      }}
    />
  );
};

// Export a no-op component if the feature is disabled
export default IS_DUB_REFERRALS_ENABLED ? ReferralClientImpl : () => null;
