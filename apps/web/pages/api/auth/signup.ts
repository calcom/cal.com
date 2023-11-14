import type { NextApiResponse } from "next";

import calcomSignupHandler from "@calcom/feature-auth/signup/handlers/calcomHandler";
import selfHostedSignupHandler from "@calcom/feature-auth/signup/handlers/selfHostedHandler";
import { type RequestWithUsernameStatus } from "@calcom/features/auth/signup/username";
import { IS_CALCOM } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server";

function ensureSignupIsEnabled() {
  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true") {
    throw new HttpError({
      statusCode: 403,
      message: "Signup is disabled",
    });
  }
}

async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  // Use a try catch instead of returning res every time
  try {
    ensureSignupIsEnabled();

    /**
     * Im not sure its worth merging these two handlers. They are different enough to be separate.
     * Calcom handles things like creating a stripe customer - which we don't need to do for self hosted.
     * It also handles things like premium username.
     * TODO: (SEAN) - Extract a lot of the logic from calcomHandler into a separate file and import it into both handlers.
     */
    if (IS_CALCOM) {
      return await calcomSignupHandler(req, res);
    }

    return await selfHostedSignupHandler(req, res);
  } catch (e) {
    if (e instanceof HttpError) {
      return res.status(e.statusCode).json({ message: e.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
