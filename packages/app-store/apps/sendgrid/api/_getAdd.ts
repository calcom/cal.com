import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import checkSession from "@calcom/app-store/src/_utils/auth";
import { checkInstalled } from "@calcom/app-store/src/_utils/installation";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  await checkInstalled("sendgrid", session.user?.id);
  return { url: "/apps/sendgrid/setup" };
}

export default defaultResponder(getHandler);
