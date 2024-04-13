import { get } from "@vercel/edge-config";
import { NextResponse } from "next/server";

const safeGet = async <T = unknown>(key: string): Promise<T | undefined> => {
  try {
    return get<T>(key);
  } catch (error) {
    // Don't crash if EDGE_CONFIG env var is missing
  }
};

export const config = { matcher: "/:path*" };

export async function middleware() {
  const isInMaintenanceMode = await safeGet<boolean>("isInMaintenanceMode");
  if (!isInMaintenanceMode) return NextResponse.next();
  // If is in maintenance mode, return a 503 status code
  return NextResponse.json(
    { message: "API is currently under maintenance. Please try again at a later time." },
    { status: 503 }
  );
}
