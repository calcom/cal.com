import type { NextApiRequest } from "next";

import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { refreshAccessToken } from "@calcom/app-store/basecamp3/lib/helpers";
import type { BasecampToken } from "@calcom/app-store/basecamp3/lib/types";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

async function handler(req: NextApiRequest) {
  if (req.method !== "POST") {
    return { status: 405, body: { message: "Method Not Allowed" } };
  }

  const userId = req.session?.user?.id;
  if (!userId) {
    return { status: 401, body: { message: "Unauthorized" } };
  }

  const { projectId } = (req.body || {}) as { projectId?: string | number };
  if (!projectId) {
    return { status: 400, body: { message: "projectId is required" } };
  }

  const { user_agent } = await getAppKeysFromSlug("basecamp3");

  const credential = await prisma.credential.findFirst({
    where: { userId },
    select: credentialForCalendarServiceSelect,
  });

  if (!credential) {
    return { status: 403, body: { message: "No credential found for user" } };
  }

  let credentialKey = credential.key as BasecampToken;

  if (credentialKey.expires_at < Date.now()) {
    credentialKey = (await refreshAccessToken(credential)) as BasecampToken;
  }

  const basecampUserId = credentialKey.account.id;
  const scheduleResponse = await fetch(`https://3.basecampapi.com/${basecampUserId}/projects/${projectId}.json`, {
    headers: {
      "User-Agent": user_agent as string,
      Authorization: `Bearer ${credentialKey.access_token}`,
    },
  });

  if (!scheduleResponse.ok) {
    return { status: 400, body: { message: "Failed to fetch project details" } };
  }

  const scheduleJson = await scheduleResponse.json();
  const dock = Array.isArray(scheduleJson?.dock) ? scheduleJson.dock : [];
  const scheduleDock = dock.find((d: { name?: string }) => d?.name === "schedule");
  const scheduleId = scheduleDock?.id as number | undefined;

  await prisma.credential.update({
    where: { id: credential.id },
    data: { key: { ...credentialKey, projectId: Number(projectId), scheduleId } },
  });

  return { status: 200, body: { message: "Updated project successfully" } };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
}); 