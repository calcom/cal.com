import { NextResponse } from "next/server";

import { dub } from "@calcom/feature-auth/lib/dub";

export const GET = async () => {
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

  return NextResponse.json({ publicToken });
};
