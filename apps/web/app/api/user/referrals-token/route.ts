import { NextResponse } from "next/server";

import { dub } from "@calcom/feature-auth/lib/dub";

export const GET = async () => {
  const session = {
    user: {
      id: "123",
      name: "John Doe",
      email: "john.doe@example.com",
      image: "https://example.com/image.png",
    },
  };
  const { publicToken } = await dub.embedTokens.referrals({
    programId: "prog_d8pl69xXCv4AoHNT281pHQdo",
    tenantId: session.user.id,
    partner: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image || null,
      tenantId: session.user.id,
    },
  });

  return NextResponse.json({ publicToken });
};
