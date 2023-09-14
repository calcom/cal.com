import type { NextApiResponse } from "next";

import calcomSignupHandler from "@calcom/feature-auth/signup/handlers/calcomHandler";
import selfhostedSignupHandler from "@calcom/feature-auth/signup/handlers/selfHostedHandler";
import { type RequestWithUsernameStatus } from "@calcom/features/auth/signup/username";
import { IS_CALCOM } from "@calcom/lib/constants";
import { HttpError } from "@calcom/lib/http-error";

function ensureReqIsPost(req: RequestWithUsernameStatus) {
  if (req.method !== "POST") {
    throw new HttpError({
      statusCode: 405,
      message: "Method not allowed",
    });
  }
}

function ensureSignupIsEnabled() {
  if (process.env.NEXT_PUBLIC_DISABLE_SIGNUP === "true") {
    throw new HttpError({
      statusCode: 403,
      message: "Signup is disabled",
    });
  }
}

export default async function handler(req: RequestWithUsernameStatus, res: NextApiResponse) {
  // Use a try catch instead of returning res every time
  try {
    ensureReqIsPost(req);
    ensureSignupIsEnabled();

    if (IS_CALCOM) {
      return calcomSignupHandler(req, res);
    }

    return selfhostedSignupHandler(req, res);
  } catch (e) {
    if (e instanceof HttpError) {
      console.log("HTTPERROR");
      res.status(e.statusCode).json({ message: e.message });
    }
    console.log("INTERNAL SERVER ERROR");
    res.status(500).json({ message: "Internal server error" });
  } finally {
    console.log("FINALLY - we have a log");
  }
}
