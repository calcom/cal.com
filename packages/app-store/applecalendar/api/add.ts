import { headers } from "next/headers";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { CalendarService } from "../lib";

async function PostHandler(req: NextRequest) {
  const { username, password } = await req.json();
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });

  if (!session) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  // Get user
  const user = await prisma.user.findFirstOrThrow({
    where: {
      id: session.user.id,
    },
    select: {
      email: true,
      id: true,
      credentials: {
        where: {
          type: "apple_calendar",
        },
      },
    },
  });

  let credentialExistsWithInputPassword = false;

  const credentialExistsWithUsername = user.credentials.find((credential) => {
    const decryptedCredential = JSON.parse(
      symmetricDecrypt(credential.key?.toString() || "", process.env.CALENDSO_ENCRYPTION_KEY || "")
    );

    if (decryptedCredential.username === username) {
      if (decryptedCredential.password === password) {
        credentialExistsWithInputPassword = true;
      }
      return true;
    }
  });

  if (credentialExistsWithInputPassword)
    return NextResponse.json({ message: "account_already_linked" }, { status: 409 });

  const data = {
    type: "apple_calendar",
    key: symmetricEncrypt(JSON.stringify({ username, password }), process.env.CALENDSO_ENCRYPTION_KEY || ""),
    userId: user.id,
    teamId: null,
    appId: "apple-calendar",
    invalid: false,
  };

  try {
    const dav = new CalendarService({
      id: 0,
      ...data,
      user: { email: user.email },
    });
    await dav?.listCalendars();
    await prisma.credential.upsert({
      where: {
        id: credentialExistsWithUsername?.id ?? -1,
      },
      create: data,
      update: data,
    });
  } catch (reason) {
    logger.error("Could not add this apple calendar account", reason);
    return NextResponse.json({ message: "unable_to_add_apple_calendar" }, { status: 500 });
  }

  return NextResponse.json(
    { url: getInstalledAppPath({ variant: "calendar", slug: "apple-calendar" }) },
    { status: 200 }
  );
}

function GetHandler() {
  return NextResponse.json({ url: "/apps/apple-calendar/setup" }, { status: 200 });
}

export const GET = GetHandler;
export const POST = PostHandler;
