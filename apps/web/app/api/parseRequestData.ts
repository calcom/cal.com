import type { NextRequest } from "next/server";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["[parseRequestData]"] });

export async function parseUrlFormData(req: NextRequest): Promise<Record<string, any>> {
  try {
    // Read raw text body (because Next.js does NOT parse x-www-form-urlencoded automatically)
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    return Object.fromEntries(params.entries());
  } catch (e) {
    log.error(`Invalid Url Form Data: ${e} from path ${req.nextUrl}`);
    throw new Error(`Invalid Url Form Data: ${e}`);
  }
}

export async function parseMultiFormData(req: NextRequest): Promise<Record<string, any>> {
  try {
    const formData = await req.formData();
    return Object.fromEntries(formData.entries());
  } catch (e) {
    log.error(`Invalid Multi Form Data: ${e} from path ${req.nextUrl}`);
    throw new Error(`Invalid Multi Form Data: ${e}`);
  }
}

export async function parseRequestData(req: NextRequest): Promise<Record<string, any>> {
  const contentType = req.headers.get("content-type") ?? "application/json";
  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch (e) {
      log.error(`Invalid JSON: ${e} from path ${req.nextUrl}`);
      throw new Error(`Invalid JSON: ${e}`);
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return await parseUrlFormData(req);
  }

  if (contentType.includes("multipart/form-data")) {
    return await parseMultiFormData(req);
  }

  log.error(`Unsupported content type: ${contentType} from path ${req.nextUrl}`);
  throw new Error(`Unsupported content type: ${contentType}`);
}
