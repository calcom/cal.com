import type { z } from "zod";

import { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TCreateInputSchema } from "./create.schema";
import {
  EventTypeCreateServiceFactory,
  LocationService,
  EventTypeDataBuilder,
  type EventTypeCreateContext,
  type EventTypeCreateData,
} from "./services";

type CreateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: any;
  };
  input: TCreateInputSchema;
};

/**
 * Handler for creating event types using a clean service-based architecture
 */
export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const locationService = new LocationService();
  const dataBuilder = new EventTypeDataBuilder();

  try {
    // Process locations
    const { locations, hasCalVideo } = await locationService.processLocations(input.locations, ctx.user);

    // Build the event type data
    const createData = dataBuilder.buildCreateData({
      ...input,
      userId: ctx.user.id,
      locations,
      hasCalVideoLocation: hasCalVideo,
    });

    // Create the context for the service
    const context: EventTypeCreateContext = {
      userId: ctx.user.id,
      teamId: input.teamId,
      organizationId: ctx.user.organizationId,
      profileId: ctx.user.profile?.id || null,
      prisma: ctx.prisma,
      isOrgAdmin: !!ctx.user.organization?.isOrgAdmin,
      userRole: ctx.user.role,
    };

    // Create the appropriate service
    const createService = EventTypeCreateServiceFactory.createService(ctx.prisma, {
      teamId: input.teamId,
      schedulingType: input.schedulingType,
    });

    // Prepare the data object for the service
    const eventTypeData: EventTypeCreateData = {
      data: createData,
      profileId: ctx.user.profile?.id || null,
    };

    // Create the event type
    const eventType = await createService.create(context, eventTypeData);

    return { eventType };
  } catch (error) {
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta?.target.includes("slug")
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "URL Slug already exists for given user.",
        });
      }
    }

    // Re-throw TRPCErrors
    if (error instanceof TRPCError) {
      throw error;
    }

    // Log unexpected errors
    console.warn("Unexpected error in createHandler:", error);
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
};
