import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";

import { dub } from "@calcom/feature-auth/lib/dub";
import { getServerSession } from "@calcom/feature-auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export const GET = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { publicToken } = await dub.embedTokens.referrals({
    programId: "prog_mODHMDrJPWlkpT7uzsUASFhK",
    tenantId: session.user.id.toString(),
    partner: {
      name: session?.user.name || "",
      email: session?.user.email || "",
      username: session?.user.username || "",
      image: session?.user.image || null,
      tenantId: session?.user.id.toString() || "",
    },
  });

  return NextResponse.json({ publicToken });
};
