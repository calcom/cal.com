import type { NextRequest } from "next/server";

export async function parseRequestData(req: NextRequest): Promise<Record<string, any>> {
  const contentType = req.headers.get("content-type") || "";

  // Handle JSON requests
  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch (error) {
      throw new Error("Invalid JSON");
    }
  }

  // Handle form data requests
  if (contentType.includes("application/x-www-form-urlencoded")) {
    try {
      const formData = await req.formData();
      return Object.fromEntries(formData.entries());
    } catch (error) {
      throw new Error("Invalid form data");
    }
  }

  // Handle multipart form data requests
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      return Object.fromEntries(formData.entries());
    } catch (error) {
      throw new Error("Invalid multipart form data");
    }
  }

  throw new Error(`Unsupported content type: ${contentType}`);
}
