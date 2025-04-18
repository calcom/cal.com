import { NextResponse } from "next/server";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import prisma from "@calcom/prisma";

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const username = params.username;
  const url = new URL(request.url);
  const checkPrevious = url.searchParams.get("checkPrevious") === "true";

  if (!username) {
    return NextResponse.json({ message: "Username is required" }, { status: 400 });
  }

  try {
    const ip = getIP({ headers: request.headers } as any) || "127.0.0.1";

    await checkRateLimitAndThrowError({
      rateLimitingType: "core", // Using "core" rate limiting type which is supported
      identifier: ip,
    });

    if (checkPrevious) {
      const userWithPreviousUsername = await prisma.user.findFirst({
        where: {
          previousUsername: username,
        },
        select: {
          username: true,
        },
      });

      if (userWithPreviousUsername?.username) {
        return NextResponse.json({ currentUsername: userWithPreviousUsername.username });
      }
    }

    const user = await prisma.user.findFirst({
      where: {
        username,
      },
      select: {
        id: true,
      },
    });

    if (user) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({ available: true });
  } catch (error: unknown) {
    console.error(error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "TOO_MANY_REQUESTS"
    ) {
      return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
