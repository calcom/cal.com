import type { NextApiRequest } from "next/types";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";

import { middleware } from "../trpc";

const rateLimitMiddleware = middleware(async ({ ctx, next, path, meta }) => {
  console.log(ctx, meta);
  if (true) {
    const userIp = ctx.req && getIP(ctx.req as NextApiRequest);

    const identifier = userIp || ctx?.user?.id.toString();

    await checkRateLimitAndThrowError({
      rateLimitingType: "core",
      identifier: `${path}.${identifier}`,
    });
  }

  return next();
});

export default rateLimitMiddleware;
