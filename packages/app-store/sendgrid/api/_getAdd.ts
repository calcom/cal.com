import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import { assertNotInstalled } from "../../_utils/installation";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  await assertNotInstalled("sendgrid", session.user?.id);
  return { url: "/apps/sendgrid/setup" };
}

export default defaultResponder(getHandler);
