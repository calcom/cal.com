import { get } from "@vercel/edge-config";
import type { NextMiddleware } from "next-api-middleware";

const safeGet = async <T = unknown>(key: string): Promise<T | undefined> => {
  try {
    return get<T>(key);
  } catch (error) {
    // Don't crash if EDGE_CONFIG env var is missing
  }
};

export const config = { matcher: "/:path*" };

export const checkIsInMaintenanceMode: NextMiddleware = async (req, res, next) => {
  const isInMaintenanceMode = await safeGet<boolean>("isInMaintenanceMode");
  if (isInMaintenanceMode) {
    return res
      .status(503)
      .json({ message: "API is currently under maintenance. Please try again at a later time." });
  }

  await next();
};
