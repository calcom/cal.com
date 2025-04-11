import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";
import { prisma } from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function handler() {
  const legacyReq = buildLegacyRequest(await headers(), await cookies());
  const session = await getServerSession({ req: legacyReq });

  if (!session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      trialEndsAt: true,
    },
  });

  if (!user) {
    throw new HttpError({ statusCode: 404, message: "User not found" });
  }

  if (!user.trialEndsAt) {
    throw new HttpError({ statusCode: 400, message: "User is not on a trial" });
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      trialEndsAt: null,
    },
  });

  return NextResponse.json({ success: true });
}

export const POST = defaultResponderForAppDir(handler);
