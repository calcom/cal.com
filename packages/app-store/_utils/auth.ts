import type { NextApiRequest } from "next";

import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";

export default function checkSession(req: NextApiRequest) {
  if (!req.session?.user?.id) {
    throw new ErrorWithCode(ErrorCode.Unauthorized, "Unauthorized");
  }
  return req.session;
}
