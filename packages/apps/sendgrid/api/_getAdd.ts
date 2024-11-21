import type { NextApiRequest } from "next";

import checkSession from "@calcom/app-store-core/_utils/auth";
import { checkInstalled } from "@calcom/app-store-core/_utils/installation";
import { defaultResponder } from "@calcom/lib/server";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  await checkInstalled("sendgrid", session.user?.id);
  return { url: "/apps/sendgrid/setup" };
}

export default defaultResponder(getHandler);
