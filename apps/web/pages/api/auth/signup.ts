import type { NextApiResponse } from "next";

import calcomSignupHandler from "@calcom/feature-auth/signup/handlers/calcomHandler";
import selfHostedSignupHandler from "@calcom/feature-auth/signup/handlers/selfHostedHandler";
import { type RequestWithUsernameStatus } from "@calcom/features/auth/signup/username";
import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { signupSchema } from "@calcom/prisma/zod-utils";

function ensureSignupIsEnabled(req: RequestWithUsernameStatus) {
  const { token } = signupSchema
    .pick({
      token: true,
    })
    .parse(req.body);

  // Stil allow signups if there is a team invite
  if (token) return;

  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true") {
    throw new HttpError({
      statusCode: 403,
      message: "Signup is disabled",
    });
  }
}

function ensureReqIsPost(req: RequestWithUsernameStatus) {
  if (req.method !== "POST") {
    throw new HttpError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }
}

export default async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  // Use a try catch instead of returning res every time
  try {
    ensureReqIsPost(req);
    ensureSignupIsEnabled(req);

    /**
     * Im not sure its worth merging these two handlers. They are different enough to be separate.
     * Calcom handles things like creating a stripe customer - which we don't need to do for self hosted.
     * It also handles things like premium username.
     * TODO: (SEAN) - Extract a lot of the logic from calcomHandler into a separate file and import it into both handlers.
     * @zomars: We need to be able to test this with E2E. They way it's done RN it will never run on CI.
     */
    if (IS_PREMIUM_USERNAME_ENABLED) {
      return await calcomSignupHandler(req, res);
    }

    return await selfHostedSignupHandler(req, res);
  } catch (e) {
    if (e instanceof HttpError) {
      return res.status(e.statusCode).json({ message: e.message });
    }
    logger.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
