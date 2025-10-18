import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { bookingCancelWithCsrfSchema } from "@calcom/prisma/zod-utils";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function handler(req: NextRequest) {
  let appDirRequestBody;
  try {
    appDirRequestBody = await req.json();
  } catch (error) {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  const bookingData = bookingCancelWithCsrfSchema.parse(appDirRequestBody);
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("calcom.csrf_token")?.value;

  if (!cookieToken || cookieToken !== bookingData.csrfToken) {
    return NextResponse.json({ success: false, message: "Invalid CSRF token" }, { status: 403 });
  }
  cookieStore.delete("calcom.csrf_token");

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const result = await handleCancelBooking({
    bookingData,
    userId: session?.user?.id || -1,
  });

  const statusCode = result.success ? 200 : 400;

  return NextResponse.json(result, { status: statusCode });
}

export const DELETE = defaultResponderForAppDir(handler);
export const POST = defaultResponderForAppDir(handler);
