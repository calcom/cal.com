import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["api/log"] });

async function postHandler(request: Request) {
  const body = await request.json();

  log.info(safeStringify(body));

  return NextResponse.json({ success: true });
}

export const POST = defaultResponderForAppDir(postHandler);
