import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";

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

const deleteHandler = apiRouteMiddleware((req: NextRequest) => handler(req));
const postHandler = apiRouteMiddleware((req: NextRequest) => handler(req));

export { deleteHandler as DELETE, postHandler as POST };
