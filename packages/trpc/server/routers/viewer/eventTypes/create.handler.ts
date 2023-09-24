import type { Prisma } from "@prisma/client";
import { v4 as uuid } from "uuid";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { MeetLocationType } from "@calcom/app-store/locations";
import getApps from "@calcom/app-store/utils";
import { handlePayments } from "@calcom/lib/payment/handlepayments";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import type { PrismaClient } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

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
  // Get Users default conferencing app
  const uid = uuid();
  const defaultConferencingData = "google-meet";
  const appKeys = await getAppKeysFromSlug("daily-video");

  let locations: { type: string; link?: string }[] = [];
  // If no locations are passed in and the user has a daily api key then default to daily
  // if (
  //   (typeof rest?.locations === "undefined" || rest.locations?.length === 0) &&
  //   typeof appKeys.api_key === "string"
  // ) {
  //   locations = [{ type: DailyLocationType }];
  // }

  const credentials = await getUsersCredentials(ctx.user.id);
  if (credentials.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please connect google meet first by navigating to settings",
    });
  }
  const foundApp = getApps(credentials, true).filter((app) => app.slug === defaultConferencingData)[0]; // There is only one possible install here so index [0] is the one we are looking for ;

  if (foundApp?.locationOption?.value) {
    locations = [{ type: MeetLocationType }];
  } else {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please connect google meet first by navigating to settings",
    });
  }

  const data: Prisma.EventTypeCreateInput = {
    ...rest,
    uid,

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

    const isOrgAdmin = !!ctx.user?.organization?.isOrgAdmin;

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
    const oldEvent = await ctx.prisma.eventType.findFirst({
      where: {
        userId: userId,
        slug: data.slug,
        paid: true,
      },
    });
    if (oldEvent) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "URL Slug already exists for given user." });
    } else {
      //console.log(data.slug);
      data.slug = "";
    }

    const createdEvent = await ctx.prisma.eventType.create({
      data,
      select: {
        id: true,
        amount: true,
      },
    });
    const payment = await handlePayments(
      {
        title: input.title,
        slug: input.slug,
        amount: createdEvent.amount,
        id: createdEvent.id,
      },
      ctx.user.email,
      ctx.user.username || ""
    );

    if (!payment) {
      await ctx.prisma.eventType.delete({
        where: {
          id: createdEvent.id,
        },
      });
      // Throw an error indicating that payment.uid was not created
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Payment not created due to internal server errror",
      });
    }
    return {
      paymentUid: payment,
    };
  } catch (e) {
    throw new TRPCError({ code: "BAD_REQUEST", message: e });
  }
};
