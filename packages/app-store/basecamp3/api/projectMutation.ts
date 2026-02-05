import type { NextApiRequest } from "next";
import { z } from "zod";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { refreshAccessToken } from "@calcom/app-store/basecamp3/lib/helpers";
import type { BasecampToken } from "@calcom/app-store/basecamp3/lib/types";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

interface IDock {
  id: number;
  name: string;
}

const ZProjectMutationInputSchema = z.object({ projectId: z.string() });

async function handler(req: NextApiRequest) {
  const userId = req.session?.user?.id;
  if (!userId) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }

  const parsed = ZProjectMutationInputSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new HttpError({
      statusCode: 400,
      message: "Invalid request body",
    });
  }
  const { projectId } = parsed.data;

  const { user_agent } = await getAppKeysFromSlug("basecamp3");

  const credential = await prisma.credential.findFirst({
    where: { userId },
    select: credentialForCalendarServiceSelect,
  });

  if (!credential) {
    throw new HttpError({ statusCode: 403, message: "No credential found for user" });
  }

  let credentialKey = credential.key as BasecampToken;

  if (credentialKey.expires_at < Date.now()) {
    credentialKey = (await refreshAccessToken(credential)) as BasecampToken;
  }

  const basecampUserId = credentialKey.account.id;
  const scheduleResponse = await fetch(
    `https://3.basecampapi.com/${basecampUserId}/projects/${projectId}.json`,
    {
      headers: {
        "User-Agent": user_agent as string,
        Authorization: `Bearer ${credentialKey.access_token}`,
      },
    }
  );

  if (!scheduleResponse.ok) {
    throw new HttpError({ statusCode: 400, message: "Failed to fetch project details" });
  }

  const scheduleJson = await scheduleResponse.json();
  const scheduleId = scheduleJson.dock.find((dock: IDock) => dock.name === "schedule").id;

  await prisma.credential.update({
    where: { id: credential.id },
    data: { key: { ...credentialKey, projectId: Number(projectId), scheduleId } },
  });

  return { message: "Updated project successfully" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
