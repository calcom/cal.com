import { VercelRequest, VercelResponse } from "@vercel/node";

import { getServerlessApp } from "../src/serverless/bootstrap";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getServerlessApp();
    const expressApp = app.getHttpAdapter().getInstance();

    req.url =
      req.url?.replace("/api/v2/cal-unified-calendars", "/v2/cal-unified-calendars") ||
      "/v2/cal-unified-calendars";

    return expressApp(req, res);
  } catch (error) {
    console.error("Cal unified calendars handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
