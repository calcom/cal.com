import type { NextRequest } from "next/server";

export async function parseRequestData(req: NextRequest): Promise<Record<string, any>> {
  const contentType = req.headers.get("content-type") || "";
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

  throw new Error(`Unsupported content type: ${contentType}`);
}
