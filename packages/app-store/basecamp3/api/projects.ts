import type { NextApiRequest } from "next";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { refreshAccessToken } from "@calcom/app-store/basecamp3/lib/helpers";
import type { BasecampToken } from "@calcom/app-store/basecamp3/lib/types";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";

async function handler(req: NextApiRequest) {
  const userId = req.session?.user?.id;
  if (!userId) {
    throw new ErrorWithCode(ErrorCode.Unauthorized, "Unauthorized");
  }

  const { user_agent } = await getAppKeysFromSlug("basecamp3");

  const credential = await prisma.credential.findFirst({
    where: { userId },
    select: credentialForCalendarServiceSelect,
  });

  if (!credential) {
    throw new ErrorWithCode(ErrorCode.Forbidden, "No credential found for user");
  }

  let credentialKey = credential.key as BasecampToken;

  if (!credentialKey.account) {
    return { currentProject: null, projects: [] };
  }

  if (credentialKey.expires_at < Date.now()) {
    credentialKey = (await refreshAccessToken(credential)) as BasecampToken;
  }

  const url = `${credentialKey.account.href}/projects.json`;
  const resp = await fetch(url, {
    headers: { "User-Agent": user_agent as string, Authorization: `Bearer ${credentialKey.access_token}` },
  });

  if (!resp.ok) {
    throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "Failed to fetch Basecamp projects");
  }

  const projects = await resp.json();
  return { currentProject: credentialKey.projectId, projects };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
