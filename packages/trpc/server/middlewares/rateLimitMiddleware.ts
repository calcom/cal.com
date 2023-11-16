import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_PRODUCTION_BUILD } from "@calcom/lib/constants";
import getIP from "@calcom/lib/getIP";

import { middleware } from "../trpc";

const rateLimitMiddleware = middleware(async (opts) => {
  console.log(opts);

  if (IS_PRODUCTION_BUILD) {
    const userIp = getIP(req);

    await checkRateLimitAndThrowError({
      rateLimitingType: "trpc",
      identifier: userIp,
    });
  }

  return opts.next();
});

export default rateLimitMiddleware;
