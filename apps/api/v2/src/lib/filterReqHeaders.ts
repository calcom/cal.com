import { IncomingHttpHeaders } from "http";

export function filterReqHeaders(headers: IncomingHttpHeaders): Partial<IncomingHttpHeaders> {
  return {
    "Content-Type": headers["content-type"],
    "User-Agent": headers["user-agent"],
    "X-Request-Id": headers["X-Request-Id"] ?? headers["x-request-id"],
    // IP-related headers
    "X-Forwarded-For": headers["x-forwarded-for"],
    "X-Forwarded-Host": headers["x-forwarded-host"],
    "CF-Connecting-IP": headers["cf-connecting-ip"],
    "CloudFront-Viewer-Address": headers["cloudfront-viewer-address"],
    // Vercel headers
    "x-vercel-id": headers["x-vercel-id"],
    "x-vercel-deployment-url": headers["x-vercel-deployment-url"],
    "x-vercel-country": headers["x-vercel-country"],
    "x-vercel-region": headers["x-vercel-region"],
    Host: headers["host"],
  };
}
