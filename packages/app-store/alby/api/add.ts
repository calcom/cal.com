import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import config from "../config.json";

export default async function handler() {
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });

  if (!session?.user?.id) {
    return NextResponse.json({ message: "You must be logged in to do this" }, { status: 401 });
  }
  const appType = config.type;
  try {
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        userId: session.user.id,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }
    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: {},
        userId: session.user.id,
        appId: "alby",
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for Alby");
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    return NextResponse.json({}, { status: 500 });
  }

  return NextResponse.json({ url: "/apps/alby/setup" }, { status: 200 });
}
