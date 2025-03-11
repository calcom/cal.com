import type { NextRequest } from "next/server";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[parseRequestData]"] });

export async function parseRequestData(req: NextRequest): Promise<Record<string, any>> {
  const contentType = req.headers.get("content-type") || "application/json";
  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch (e) {
      throw new Error(`Invalid JSON: ${e}`);
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const formData = await req.formData();
      return Object.fromEntries(formData.entries());
    } catch (e) {
      throw new Error(`Invalid Form Data: ${e}`);
    }
  }
  log.error(`Unsupported content type: ${contentType} from path ${req.nextUrl}`);
  throw new Error(`Unsupported content type: ${contentType}`);
}
