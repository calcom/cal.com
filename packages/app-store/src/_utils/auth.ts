import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

export default function checkSession(req: NextApiRequest) {
  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
  return req.session;
}
