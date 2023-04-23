import type { Prisma } from "@prisma/client";
import { SchedulingType } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { DailyLocationType } from "@calcom/app-store/locations";
import getApps from "@calcom/app-store/utils";
import type { PrismaClient } from "@calcom/prisma/client";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { schedulingType, teamId, metadata, ...rest } = input;
  const userId = ctx.user.id;
  const isManagedEventType = schedulingType === SchedulingType.MANAGED;
  // Get Users default conferncing app

  const defaultConferencingData = userMetadataSchema.parse(ctx.user.metadata)?.defaultConferencingApp;
  const appKeys = await getAppKeysFromSlug("daily-video");

  let locations: { type: string; link?: string }[] = [];

  // If no locations are passed in and the user has a daily api key then default to daily
  if (
    (typeof rest?.locations === "undefined" || rest.locations?.length === 0) &&
    typeof appKeys.api_key === "string"
  ) {
    locations = [{ type: DailyLocationType }];
  }

  // If its defaulting to daily no point handling compute as its done
  if (defaultConferencingData && defaultConferencingData.appSlug !== "daily-video") {
    const credentials = ctx.user.credentials;
    const foundApp = getApps(credentials).filter((app) => app.slug === defaultConferencingData.appSlug)[0]; // There is only one possible install here so index [0] is the one we are looking for ;
    const locationType = foundApp?.locationOption?.value ?? DailyLocationType; // Default to Daily if no location type is found
    locations = [{ type: locationType, link: defaultConferencingData.appLink }];
  }

  const data: Prisma.EventTypeCreateInput = {
    ...rest,
    owner: teamId ? undefined : { connect: { id: userId } },
    metadata: (metadata as Prisma.InputJsonObject) ?? undefined,
    // Only connecting the current user for non-managed event type
    users: isManagedEventType ? undefined : { connect: { id: userId } },
    locations,
  };

  if (teamId && schedulingType) {
    const hasMembership = await ctx.prisma.membership.findFirst({
      where: {
        userId,
        teamId: teamId,
        accepted: true,
      },
    });

    if (!hasMembership?.role || !["ADMIN", "OWNER"].includes(hasMembership.role)) {
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
    const eventType = await ctx.prisma.eventType.create({ data });
    return { eventType };
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta?.target.includes("slug")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL Slug already exists for given user." });
      }
    }
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
};
