import { DubEmbed } from "@dub/embed-react";
import { Suspense } from "react";

import { dub } from "@calcom/feature-auth/lib/dub";

export default function ReferralsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* @ts-expect-error Async Server Component */}
      <ReferralsPageRSC />
    </Suspense>
  );
}

async function ReferralsPageRSC() {
  const session = {
    user: {
      id: "123",
      name: "John Doe",
      email: "john.doe@example.com",
      username: "john",
      image: "https://example.com/image.png",
    },
  };
  const { publicToken } = await dub.embedTokens.referrals({
    programId: "prog_mODHMDrJPWlkpT7uzsUASFhK",
    tenantId: session.user.id,
    partner: {
      name: session.user.name,
      email: session.user.email,
      username: session.user.username,
      image: session.user.image || null,
      tenantId: session.user.id,
    },
  });

  if (!publicToken) {
    return <div>No public token</div>;
  }

  return <DubEmbed data="referrals" token={publicToken} />;
}
