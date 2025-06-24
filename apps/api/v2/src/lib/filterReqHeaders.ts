import { IncomingHttpHeaders } from "http";

export function filterReqHeaders(headers: IncomingHttpHeaders): Partial<IncomingHttpHeaders> {
  return {
    "Content-Type": headers["Content-Type"] ?? headers["content-type"],
    Authorization: headers["Authorization"] ?? headers["authorization"],
    "X-Cal-Client-Id": headers["X-Cal-Client-Id"] ?? headers["x-cal-client-id"],
    "Cal-Api-Version": headers["Cal-Api-Version"] ?? headers["cal-api-version"],
    "X-Request-Id": headers["X-Request-Id"] ?? headers["x-request-id"],
    "User-Agent": headers["User-agent"] ?? headers["user-agent"],
    "X-Forwarded-For": headers["x-forwarded-for"],
    "X-Forwarded-Host": headers["x-forwarded-host"],
    "CF-Connecting-IP": headers["cf-connecting-ip"],
    "CloudFront-Viewer-Address": headers["cloudfront-viewer-address"],
    "X-Vercel-Id": headers["x-vercel-id"],
    "X-Vercel-Deployment-Url": headers["x-vercel-deployment-url"],
    "X-Vercel-Country": headers["x-vercel-country"],
    "X-Vercel-Region": headers["x-vercel-region"],
    Host: headers["Host"] ?? headers["host"],
  };
}
