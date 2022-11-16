import type { NextApiRequest, NextApiResponse } from "next";

import Sendgrid from "@calcom/lib/Sendgrid";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { api_key } = req.body;
  if (!api_key) throw new HttpError({ statusCode: 400, message: "No Api Key provoided to check" });

  checkSession(req);

  const sendgrid: Sendgrid = new Sendgrid(api_key);

  try {
    const usernameInfo = await sendgrid.username();
    if (usernameInfo.username) {
      return {};
    } else {
      return { error: true };
    }
  } catch (e) {
    return { error: true };
  }
}

export default defaultResponder(getHandler);
