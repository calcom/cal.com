import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { runWithTenants } from "./prismaStore";
import { TENANT_LIST } from "./tenants";

type Params = {
  [param: string]: string | string[] | undefined;
};

type Handler<T extends NextResponse | Response = NextResponse> = (
  req: NextRequest,
  ctx: { params: Promise<Params> }
) => Promise<T>;

/**
 * Runs the provided handler once for each tenant (US and EU) in an isolated context and merges the results.
 *
 * This is intended for use in cron handlers only, as these are called internally by the system.
 * Using this in externally-facing endpoints (e.g., user-facing API routes) is not supported and may result in only one tenant being processed.
 *
 * @param handler - The handler function to run for each tenant. Should match the signature of a Next.js API handler.
 * @returns A handler that, when called, runs the original handler for each tenant and returns a merged JSON response keyed by tenant.
 */
export function withMultiTenantPrisma<T extends NextResponse | Response = NextResponse>(
  handler: Handler<T>
): (req: NextRequest, ctx: { params: Promise<Params> }) => Promise<NextResponse> {
  return async (req: NextRequest, ctx: { params: Promise<Params> }) => {
    const results: Record<string, any> = {};
    for (const tenant of TENANT_LIST) {
      const response = await runWithTenants(tenant, async () => handler(req.clone() as NextRequest, ctx));
      const data = response instanceof Response ? await response.json() : response;
      results[tenant] = data;
    }
    return NextResponse.json(results);
  };
}
