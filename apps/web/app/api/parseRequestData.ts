import type { NextRequest } from "next/server";

export async function parseRequestData(req: NextRequest): Promise<Record<string, any>> {
  try {
    return await req.json();
  } catch (error) {
    const contentType = req.headers.get("content-type") || "";
    // Handle form data requests
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await req.formData();
      return Object.fromEntries(formData.entries());
    }

    throw new Error(`Unsupported content type: ${contentType}`);
  }
}
