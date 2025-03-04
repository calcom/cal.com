"use client";

import { DubEmbed } from "@dub/embed-react";

export default function ReferralClient({ publicToken }: { publicToken: string }) {
  return <DubEmbed data="referrals" token={publicToken} />;
}
