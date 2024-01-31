import type { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { z } from "zod";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { DailyLocationType } from "@calcom/app-store/locations";
import getApps from "@calcom/app-store/utils";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "./../trpc/server/trpc";

interface createEventTypeProps extends z.infer<typeof createEventTypeInput> {
  prisma: PrismaClient;
  user: NonNullable<TrpcSessionUser>;
}

export default async function createEventType({
  prisma,
  user,
  title,
  slug,
  description,
  length,
  hidden,
  locations,
  schedulingType,
  teamId,
  metadata,
}: createEventTypeProps) {
  const userId = user.id;
  const isManagedEventType = schedulingType === SchedulingType.MANAGED;
  // Get Users default conferencing app

  const defaultConferencingData = userMetadataSchema.parse(user.metadata)?.defaultConferencingApp;
  const appKeys = await getAppKeysFromSlug("daily-video");

  let locationsArray: { type: string; link?: string }[] = [];

  // If no locations are passed in and the user has a daily api key then default to daily
  if ((typeof locations === "undefined" || locations?.length === 0) && typeof appKeys.api_key === "string") {
    locationsArray = [{ type: DailyLocationType }];
  }

  if (defaultConferencingData && defaultConferencingData.appSlug !== "daily-video") {
    const credentials = await getUsersCredentials(user.id);
    const foundApp = getApps(credentials, true).filter(
      (app) => app.slug === defaultConferencingData.appSlug
    )[0]; // There is only one possible install here so index [0] is the one we are looking for ;
    const locationType = foundApp?.locationOption?.value ?? DailyLocationType; // Default to Daily if no location type is found
    locationsArray = [{ type: locationType, link: defaultConferencingData.appLink }];
  }

  const data: Prisma.EventTypeCreateInput = {
    title,
    slug,
    description,
    length,
    hidden,
    owner: teamId ? undefined : { connect: { id: userId } },
    // metadata: metadata as unknown as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined,
    metadata: (metadata as Prisma.InputJsonObject) ?? undefined,
    // Only connecting the current user for non-managed event type
    users: isManagedEventType ? undefined : { connect: { id: userId } },
    locations: locationsArray,
  };

  if (teamId && schedulingType) {
    const hasMembership = await prisma.membership.findFirst({
      where: {
        userId,
        teamId: teamId,
        accepted: true,
      },
    });

    const isOrgAdmin = !!user?.organization?.isOrgAdmin;

    if (!hasMembership?.role || !(["ADMIN", "OWNER"].includes(hasMembership.role) || isOrgAdmin)) {
      console.warn(`User ${userId} does not have permission to create this new event type`);
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    data.team = {
      connect: {
        id: teamId,
      },
    };
    data.schedulingType = schedulingType;
  }

  try {
    const eventType = await prisma.eventType.create({ data });
    return { eventType };
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta?.target.includes("slug")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL Slug already exists for given user." });
      }
    }
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
}
