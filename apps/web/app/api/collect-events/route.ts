import { collectApiHandler } from "next-collect/server";
import type { NextRequest } from "next/server";
import type { NextApiRequest } from "next/types";

import { extendEventData, nextCollectBasicSettings } from "@calcom/lib/telemetry";

export async function GET(req: NextRequest) {
  return handleCollect(req);
}

export async function POST(req: NextRequest) {
  return handleCollect(req);
}

async function handleCollect(req: NextRequest) {
  const collectHandler = collectApiHandler({
    ...nextCollectBasicSettings,
    cookieName: "__clnds",
    extend: extendEventData,
  });

  const cookies = Object.fromEntries(req.cookies.getAll().map((c) => [c.name, c.value]));
  const query = Object.fromEntries(req.nextUrl.searchParams);
  const headers = Object.fromEntries(req.headers);

  const nextCollectReq = {
    ...req,
    cookies,
    query,
    method: req.method,
    headers,
    body: req.method === "POST" ? await req.json() : undefined,
  } as unknown as NextApiRequest;

  return await collectHandler(
    nextCollectReq,
    new Proxy(Object.create(null), {
      get() {
        throw new Error("`res` is not supported in app dir");
      },
    })
  );
}

export const dynamic = "force-dynamic";
