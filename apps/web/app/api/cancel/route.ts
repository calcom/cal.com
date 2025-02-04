import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function handler(req: NextRequest) {
  let appDirRequestBody;
  try {
    appDirRequestBody = await req.json();
  } catch (error) {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  const result = await handleCancelBooking({
    appDirRequestBody,
    userId: session?.user?.id || -1,
  });

  const statusCode = result.success ? 200 : 400;

  return NextResponse.json(result, { status: statusCode });
}

export async function DELETE(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}
