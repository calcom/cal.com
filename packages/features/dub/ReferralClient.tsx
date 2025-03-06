"use client";

import { DubEmbed } from "@dub/embed-react";
import { useTheme } from "next-themes";

export default function ReferralClient({ publicToken }: { publicToken: string }) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <DubEmbed
      data="referrals"
      token={publicToken}
      options={{
        theme,
      }}
    />
  );
}
