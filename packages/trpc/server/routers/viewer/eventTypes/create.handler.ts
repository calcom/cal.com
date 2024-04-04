import type { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { DailyLocationType } from "@calcom/app-store/locations";
import getApps from "@calcom/app-store/utils";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeLocation } from "@calcom/prisma/zod/custom/eventtype";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";

type SessionUser = NonNullable<TrpcSessionUser>;
type User = {
  id: SessionUser["id"];
  organizationId: SessionUser["organizationId"];
  organization: {
    isOrgAdmin: SessionUser["organization"]["isOrgAdmin"];
  };
  profile: {
    id: SessionUser["id"] | null;
  };
  metadata: SessionUser["metadata"];
};

type CreateOptions = {
  ctx: {
    user: User;
    prisma: PrismaClient;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { schedulingType, teamId, metadata, locations: inputLocations, ...rest } = input;

  const userId = ctx.user.id;
  const isManagedEventType = schedulingType === SchedulingType.MANAGED;
  const isOrgAdmin = !!ctx.user?.organization?.isOrgAdmin;

  const locations: EventTypeLocation[] =
    inputLocations && inputLocations.length !== 0 ? inputLocations : await getDefaultLocations(ctx.user);

  const data: Prisma.EventTypeCreateInput = {
    ...rest,
    owner: teamId ? undefined : { connect: { id: userId } },
    metadata: (metadata as Prisma.InputJsonObject) ?? undefined,
    // Only connecting the current user for non-managed event types and non team event types
    users: isManagedEventType || schedulingType ? undefined : { connect: { id: userId } },
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

  // If we are in an organization & they are not admin & they are not creating an event on a teamID
  // Check if evenTypes are locked.
  if (ctx.user.organizationId && !ctx.user?.organization?.isOrgAdmin && !teamId) {
    const orgSettings = await ctx.prisma.organizationSettings.findUnique({
      where: {
        organizationId: ctx.user.organizationId,
      },
      select: {
        lockEventTypeCreationForUsers: true,
      },
    });

    const orgHasLockedEventTypes = !!orgSettings?.lockEventTypeCreationForUsers;
    if (orgHasLockedEventTypes) {
      console.warn(
        `User ${userId} does not have permission to create this new event type - Locked status: ${orgHasLockedEventTypes}`
      );
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  const profile = ctx.user.profile;
  try {
    const eventType = await EventTypeRepository.create({
      ...data,
      profileId: profile.id,
    });
    return { eventType };
  } catch (e) {
    console.warn(e);
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta?.target.includes("slug")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL Slug already exists for given user." });
      }
    }
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
};

async function getDefaultLocations(user: User): Promise<EventTypeLocation[]> {
  const defaultConferencingData = userMetadataSchema.parse(user.metadata)?.defaultConferencingApp;
  const appKeys = await getAppKeysFromSlug("daily-video");

  if (typeof appKeys.api_key === "string") {
    return [{ type: DailyLocationType }];
  }

  if (defaultConferencingData && defaultConferencingData.appSlug !== "daily-video") {
    const credentials = await getUsersCredentials(user);
    const foundApp = getApps(credentials, true).filter(
      (app) => app.slug === defaultConferencingData.appSlug
    )[0]; // There is only one possible install here so index [0] is the one we are looking for ;
    const locationType = foundApp?.locationOption?.value ?? DailyLocationType; // Default to Daily if no location type is found
    return [{ type: locationType, link: defaultConferencingData.appLink }];
  }

  return [];
}
