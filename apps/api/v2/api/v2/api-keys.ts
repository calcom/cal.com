import { VercelRequest, VercelResponse } from "@vercel/node";

import { getServerlessApp } from "../../src/serverless/bootstrap";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getServerlessApp();
    const expressApp = app.getHttpAdapter().getInstance();

    req.url = req.url?.replace("/api/v2/api-keys", "/v2/api-keys") || "/v2/api-keys";

    return expressApp(req, res);
  } catch (error) {
    console.error("API keys handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
