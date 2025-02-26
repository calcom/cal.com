import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function handler(req: NextRequest) {
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      password: true,
      identityProvider: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (user.identityProvider !== IdentityProvider.CAL) {
    return NextResponse.json({ error: ErrorCode.ThirdPartyIdentityProviderEnabled }, { status: 400 });
  }

  const { oldPassword, newPassword } = await req.json();

  const currentPassword = user.password?.hash;
  if (!currentPassword) {
    return NextResponse.json({ error: ErrorCode.UserMissingPassword }, { status: 400 });
  }

  const passwordsMatch = await verifyPassword(oldPassword, currentPassword);
  if (!passwordsMatch) {
    return NextResponse.json({ error: ErrorCode.IncorrectPassword }, { status: 403 });
  }

  if (oldPassword === newPassword) {
    return NextResponse.json({ error: ErrorCode.NewPasswordMatchesOld }, { status: 400 });
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.userPassword.upsert({
    where: {
      userId: user.id,
    },
    create: {
      hash: hashedPassword,
      userId: user.id,
    },
    update: {
      hash: hashedPassword,
    },
  });

  return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
}

const postHandler = apiRouteMiddleware((req: NextRequest) => handler(req));

export { postHandler as POST };
