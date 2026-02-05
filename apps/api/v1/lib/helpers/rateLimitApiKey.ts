import type { NextMiddleware } from "next-api-middleware";

// Rate limiting for API v1 has been removed - now handled by Cloudflare Enterprise Advanced Rate Limiting
// This middleware is kept for backwards compatibility but no longer performs rate limiting
export const rateLimitApiKey: NextMiddleware = async (req, res, next) => {
  if (!req.userId) return res.status(401).json({ message: "No userId provided" });
  if (!req.query.apiKey) return res.status(401).json({ message: "No apiKey provided" });

  await next();
};
