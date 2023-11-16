import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";

import { middleware } from "../trpc";

const rateLimitMiddleware = middleware(async ({ next }) => {
  const userIp = getIP(req);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });

  return await next();
});

export default rateLimitMiddleware;
