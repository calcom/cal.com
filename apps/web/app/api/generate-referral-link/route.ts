import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { dub } from "@calcom/features/auth/lib/dub";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export async function POST() {
  const headersList = headers();
  const cookiesList = cookies();
  const legacyReq = buildLegacyRequest(headersList, cookiesList);

  const session = await getServerSession({ req: legacyReq });

  if (!session?.user?.username) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { shortLink } = await dub.links.get({
      externalId: `ext_${session.user.id.toString()}`,
    });
    return NextResponse.json({ shortLink });
  } catch (error) {
    console.log("Referral link not found, creating...");
  }

  const { id: referralLinkId, shortLink } = await dub.links.create({
    domain: "refer.cal.com",
    key: session.user.username,
    url: "https://cal.com",
    externalId: session.user.id.toString(), // @see https://d.to/externalId
    trackConversion: true, // enable conversion tracking @see https://d.to/conversions
  });

  /*
    Even though we are relying in externalId for retrieving the referral link,
    we still save the referralLinkId in the database for future reference.
    E.g. we can use this to tell how many users created a referral link.
  */
  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      referralLinkId,
    },
  });

  return NextResponse.json({ shortLink });
}
