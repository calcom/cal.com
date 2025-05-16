import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getTenantFromHost } from "@calcom/prisma/store/tenants";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const tenant = getTenantFromHost(host);

  if (!tenant) {
    return new NextResponse("Unknown tenant", { status: 400 });
  }

  const response = NextResponse.next();
  response.headers.set("x-tenant-id", tenant);
  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
