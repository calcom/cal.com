import type { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { DailyLocationType } from "@calcom/app-store/locations";
import { IS_DEV, ONEHASH_API_KEY, ONEHASH_CHAT_SYNC_BASE_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { getDefaultLocations } from "@calcom/lib/server/getDefaultLocations";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import type { EventTypeLocation } from "@calcom/prisma/zod/custom/eventtype";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TCreateInputSchema } from "./create.schema";

type SessionUser = NonNullable<TrpcSessionUser>;
type User = {
  id: SessionUser["id"];
  role: SessionUser["role"];
  organizationId: SessionUser["organizationId"];
  organization: {
    isOrgAdmin: SessionUser["organization"]["isOrgAdmin"];
  };
  profile: {
    id: SessionUser["id"] | null;
  };
  metadata: SessionUser["metadata"];
  email: SessionUser["email"];
  username: SessionUser["username"];
};

type CreateOptions = {
  ctx: {
    user: User;
    prisma: PrismaClient;
  };
  input: TCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const {
    schedulingType,
    teamId,
    metadata,
    locations: inputLocations,
    scheduleId,
    calVideoSettings,
    ...rest
  } = input;

  const userId = ctx.user.id;
  const isManagedEventType = schedulingType === SchedulingType.MANAGED;
  const isOrgAdmin = !!ctx.user?.organization?.isOrgAdmin;

  const locations: EventTypeLocation[] =
    inputLocations && inputLocations.length !== 0 ? inputLocations : await getDefaultLocations(ctx.user);

  const isCalVideoLocationActive = locations.some((location) => location.type === DailyLocationType);

  const data: Prisma.EventTypeCreateInput = {
    ...rest,
    owner: teamId ? undefined : { connect: { id: userId } },
    metadata: (metadata as Prisma.InputJsonObject) ?? undefined,
    // Only connecting the current user for non-managed event types and non team event types
    users: isManagedEventType || schedulingType ? undefined : { connect: { id: userId } },
    locations,
    schedule: scheduleId ? { connect: { id: scheduleId } } : undefined,
  };

  if (isCalVideoLocationActive && calVideoSettings) {
    data.calVideoSettings = {
      create: {
        disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
        disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
        enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
        enableAutomaticRecordingForOrganizer: calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
        disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
        disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
        redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
      },
    };
  }

  if (teamId && schedulingType) {
    const hasMembership = await ctx.prisma.membership.findFirst({
      where: {
        userId,
        teamId: teamId,
        accepted: true,
      },
    });

    const isSystemAdmin = ctx.user.role === "ADMIN";

    if (
      !isSystemAdmin &&
      !isOrgAdmin &&
      (!hasMembership?.role || !["ADMIN", "OWNER"].includes(hasMembership.role))
    ) {
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
    const eventTypeRepo = new EventTypeRepository(ctx.prisma);
    const eventType = await eventTypeRepo.create({
      ...data,
      profileId: profile.id,
    });
    if (!teamId && isPrismaObjOrUndefined(ctx.user.metadata)?.connectedChatAccounts) {
      await handleOHChatSync({
        prismaClient: ctx.prisma,
        userId: userId,
        eventUid: eventType.id,
        title: eventType.title,
        url: `${WEBAPP_URL}/${ctx.user.username}/${eventType.slug}`,
      });
    }
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

const handleOHChatSync = async ({
  prismaClient,
  eventUid,
  title,
  url,
  userId,
}: {
  prismaClient: PrismaClient;
  eventUid: number;
  title: string;
  url: string;
  userId: number;
}): Promise<void> => {
  if (IS_DEV) return Promise.resolve();

  const credentials = await prismaClient.credential.findMany({
    where: {
      appId: "onehash-chat",
      userId,
    },
  });

  if (credentials.length == 0) return Promise.resolve();

  const account_user_ids: number[] = credentials.reduce<number[]>((acc, cred) => {
    const accountUserId = isPrismaObjOrUndefined(cred.key)?.account_user_id as number | undefined;
    if (accountUserId !== undefined) {
      acc.push(accountUserId);
    }
    return acc;
  }, []);

  const data = {
    account_user_ids,
    cal_events: [
      {
        uid: eventUid,
        title,
        url,
      },
    ],
  };
  await fetch(`${ONEHASH_CHAT_SYNC_BASE_URL}/cal_event`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ONEHASH_API_KEY}`,
    },
    body: JSON.stringify(data),
  });
};
