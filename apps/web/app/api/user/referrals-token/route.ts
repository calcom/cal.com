import { dub } from "@calcom/feature-auth/lib/dub";
import { getServerSession } from "@calcom/feature-auth/lib/getServerSession";
import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const handler = async () => {
  // Return early if the feature is disabled
  if (!IS_DUB_REFERRALS_ENABLED) {
    return NextResponse.json({ error: "Referrals feature is disabled" }, { status: 404 });
  }

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { publicToken } = await dub.embedTokens.referrals({
    programId: process.env.NEXT_PUBLIC_DUB_PROGRAM_ID as string,
    tenantId: session.user.id.toString(),
    partner: {
      name: session?.user.name || session?.user.email || "",
      email: session?.user.email || session?.user.name || "",
      username: session?.user.username || "",
      image: session?.user.image || null,
      tenantId: session?.user.id.toString() || "",
    },
  });

  return NextResponse.json({ publicToken });
};

export const GET = defaultResponderForAppDir(handler);
