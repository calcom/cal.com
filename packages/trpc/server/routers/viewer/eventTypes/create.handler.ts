import type { Prisma } from "@prisma/client";
import type { App } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { v4 as uuid } from "uuid";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import type { LocationObject } from "@calcom/app-store/locations";
import { DailyLocationType } from "@calcom/app-store/locations";
import getApps from "@calcom/app-store/utils";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { parseRecurringEvent } from "@calcom/lib";
import { handlePayments } from "@calcom/lib/payment/handlepayments";
import { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";
import prisma, { userSelect } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import {
  customInputSchema,
  EventTypeMetaDataSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";

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
interface IEventTypePaymentCredentialType {
  appId: EventTypeAppsList;
  app: {
    categories: App["categories"];
    dirName: string;
  };
  key: Prisma.JsonValue;
}
type Booking = {
  user: { email: string | null; name: string | null; timeZone: string } | null;
  id: number;
  startTime?: { toISOString: () => string };
  uid: string;
};
type User = Prisma.UserGetPayload<typeof userSelect>;
export const createHandler = async ({ ctx, input }: CreateOptions) => {
  const { schedulingType, teamId, metadata, ...rest } = input;
  const userId = ctx.user.id;
  const isManagedEventType = schedulingType === SchedulingType.MANAGED;
  // Get Users default conferencing app
  const uid = uuid();
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

  if (defaultConferencingData && defaultConferencingData.appSlug !== "daily-video") {
    const credentials = await getUsersCredentials(ctx.user.id);
    const foundApp = getApps(credentials, true).filter(
      (app) => app.slug === defaultConferencingData.appSlug
    )[0]; // There is only one possible install here so index [0] is the one we are looking for ;
    const locationType = foundApp?.locationOption?.value ?? DailyLocationType; // Default to Daily if no location type is found
    locations = [{ type: locationType, link: defaultConferencingData.appLink }];
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
    const createdEvent = await ctx.prisma.eventType.create({
      data,
      select: {
        id: true,
        uid: true,
        customInputs: true,
        disableGuests: true,
        users: {
          select: {
            credentials: true,
            ...userSelect.select,
          },
        },
        slug: true,
        team: {
          select: {
            id: true,
            name: true,
            metadata: true,
          },
        },
        bookingFields: true,
        title: true,
        length: true,
        eventName: true,
        schedulingType: true,
        description: true,
        periodType: true,
        periodStartDate: true,
        periodEndDate: true,
        periodDays: true,
        periodCountCalendarDays: true,
        requiresConfirmation: true,
        requiresBookerEmailVerification: true,
        userId: true,
        price: true,
        currency: true,
        metadata: true,
        destinationCalendar: true,
        hideCalendarNotes: true,
        seatsPerTimeSlot: true,
        recurringEvent: true,
        seatsShowAttendees: true,
        bookingLimits: true,
        durationLimits: true,
        parentId: true,
        owner: {
          select: {
            hideBranding: true,
            metadata: true,
            teams: {
              select: {
                accepted: true,
                team: {
                  select: {
                    metadata: true,
                  },
                },
              },
            },
          },
        },
        workflows: {
          include: {
            workflow: {
              include: {
                steps: true,
              },
            },
          },
        },
        locations: true,
        timeZone: true,
        schedule: {
          select: {
            availability: true,
            timeZone: true,
          },
        },
        hosts: {
          select: {
            isFixed: true,
            user: {
              select: {
                credentials: true,
                ...userSelect.select,
                organization: {
                  select: {
                    slug: true,
                  },
                },
              },
            },
          },
        },
        availability: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
            days: true,
          },
        },
      },
    });
    const eventType = {
      ...createdEvent,
      metadata: EventTypeMetaDataSchema.parse(createdEvent?.metadata || {}),
      recurringEvent: parseRecurringEvent(createdEvent?.recurringEvent),
      customInputs: customInputSchema.array().parse(createdEvent?.customInputs || []),
      locations: (createdEvent?.locations ?? []) as LocationObject[],
      bookingFields: getBookingFieldsWithSystemFields(createdEvent || {}),
      isDynamic: false,
    };
    const paymentAppData = {
      enabled: true,
      credentialId: 2,
      price: 67000,
      currency: "inr",
      paymentOption: "ON_BOOKING",
      TRACKING_ID: undefined,
      appId: "stripe",
    };
    console.log("ddkkffkfkfkfkkf");
    // console.log(paymentAppData);
    const credentialPaymentAppCategories = await prisma.credential.findMany({
      where: {
        ...(paymentAppData.credentialId ? { id: paymentAppData.credentialId } : { userId: 5 }),
        app: {
          categories: {
            hasSome: ["payment"],
          },
        },
      },
      select: {
        key: true,
        appId: true,
        app: {
          select: {
            categories: true,
            dirName: true,
          },
        },
      },
    });
    console.log("Gggggggg");
    console.log(credentialPaymentAppCategories);
    const eventTypePaymentAppCredential = credentialPaymentAppCategories.find((credential) => {
      return credential.appId === paymentAppData.appId;
    });
    console.log("gggggghhhhhh");
    console.log(eventTypePaymentAppCredential);
    if (!eventTypePaymentAppCredential) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Missing payment credentials" });
    }
    if (!eventTypePaymentAppCredential?.appId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Missing payment app id" });
    }

    const payment = await handlePayments(
      eventType,
      eventTypePaymentAppCredential as IEventTypePaymentCredentialType,
      {
        user: {
          email: createdEvent.users[0].email,
          name: createdEvent.users[0].name,
          timeZone: createdEvent.users[0].timeZone,
        },

        id: createdEvent.id,
        uid: createdEvent.uid,
      },
      createdEvent.users[0].email
    );
    console.log("finnna");
    console.log(eventType);
    if (!payment?.uid) {
      // Delete the created event type
      await ctx.prisma.eventType.delete({
        where: {
          id: createdEvent.id,
        },
      });
      // Throw an error indicating that payment.uid was not created
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Payment uid not created. Event type deleted.",
      });
    }

    // Return the payment.uid if it's created
    return {
      name: createdEvent.users[0].name,
      paymentUid: payment.uid,
      email: createdEvent.users[0].email,
    };

    // return { eventType };
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta?.target.includes("slug")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL Slug already exists for given user." });
      }
    }
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
};
