import type { PrismaClient } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import type { BasecampToken } from "../lib/CalendarService";
import { refreshAccessToken } from "../lib/helpers";
import type { TProjectMutationInputSchema } from "./projectMutation.schema";

interface ProjectMutationHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TProjectMutationInputSchema;
}

export const projectMutationHandler = async ({ ctx, input }: ProjectMutationHandlerOptions) => {
  const { user_agent } = await getAppKeysFromSlug("basecamp3");
  const { user, prisma } = ctx;

  const { projectId } = input;
  const credential = await prisma.credential.findFirst({
    where: {
      userId: user?.id,
    },
    select: credentialForCalendarServiceSelect,
  });

  if (!credential) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No credential found for user" });
  }
  let credentialKey = credential.key as BasecampToken;

  if (credentialKey.expires_at < Date.now()) {
    credentialKey = (await refreshAccessToken(credential)) as BasecampToken;
  }
  // get schedule id
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
  const scheduleJson = await scheduleResponse.json();
  const scheduleId = scheduleJson.dock.find((dock: any) => dock.name === "schedule").id;
  await prisma.credential.update({
    where: { id: credential.id },
    data: { key: { ...credentialKey, projectId: Number(projectId), scheduleId } },
  });

  return { messsage: "Updated project successfully" };
};
