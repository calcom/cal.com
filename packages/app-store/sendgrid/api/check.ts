import type { NextApiRequest } from "next";

import Sendgrid from "@calcom/lib/Sendgrid";
import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import checkSession from "../../_utils/auth";

export async function getHandler(req: NextApiRequest) {
  const { api_key } = req.body;
  if (!api_key) throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "No Api Key provoided to check");

  checkSession(req);

  const sendgrid: Sendgrid = new Sendgrid(api_key);

  try {
    const usernameInfo = await sendgrid.username();
    if (usernameInfo.username) {
      return {};
    } else {
      throw new ErrorWithCode(ErrorCode.ResourceNotFound);
    }
  } catch (e) {
    throw new ErrorWithCode(ErrorCode.InternalServerError, e as string);
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(getHandler) }),
});
