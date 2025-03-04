import { Suspense } from "react";

import ReferralClient from "@calcom/features/dub/ReferralClient";

async function getReferralToken() {
  const response = await fetch(`/api/user/referrals-token`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch referral token");
  }

  const data = await response.json();
  return data.publicToken;
}

export default async function ReferralsPage() {
  const publicToken = await getReferralToken();

  if (!publicToken) {
    return <div>No public token</div>;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReferralClient publicToken={publicToken} />
    </Suspense>
  );
}
