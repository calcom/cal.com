import { MembershipRole, PeriodType, Prisma, SchedulingType } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
// REVIEW: From lint error
import _ from "lodash";
import { z } from "zod";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import type { LocationObject } from "@calcom/app-store/locations";
import { DailyLocationType } from "@calcom/app-store/locations";
import { stripeDataSchema } from "@calcom/app-store/stripepayment/lib/server";
import getApps, { getAppFromLocationValue, getAppFromSlug } from "@calcom/app-store/utils";
import { validateBookingLimitOrder } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import getEventTypeById from "@calcom/lib/getEventTypeById";
import { baseEventTypeSelect, baseUserSelect } from "@calcom/prisma";
import { _DestinationCalendarModel, _EventTypeModel } from "@calcom/prisma/zod";
import type { CustomInputSchema } from "@calcom/prisma/zod-utils";
import { eventTypeLocations as eventTypeLocationsSchema } from "@calcom/prisma/zod-utils";
import {
  customInputSchema,
  EventTypeMetaDataSchema,
  stringOrNumber,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";
import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";

import { TRPCError } from "@trpc/server";

import { authedProcedure, router } from "../../trpc";
import { viewerRouter } from "../viewer";

function isPeriodType(keyInput: string): keyInput is PeriodType {
  return Object.keys(PeriodType).includes(keyInput);
}

function handlePeriodType(periodType: string | undefined): PeriodType | undefined {
  if (typeof periodType !== "string") return undefined;
  const passedPeriodType = periodType.toUpperCase();
  if (!isPeriodType(passedPeriodType)) return undefined;
  return PeriodType[passedPeriodType];
}

function handleCustomInputs(customInputs: CustomInputSchema[], eventTypeId: number) {
  const cInputsIdsToDeleteOrUpdated = customInputs.filter((input) => !input.hasToBeCreated);
  const cInputsIdsToDelete = cInputsIdsToDeleteOrUpdated.map((e) => e.id);
  const cInputsToCreate = customInputs
    .filter((input) => input.hasToBeCreated)
    .map((input) => ({
      type: input.type,
      label: input.label,
      required: input.required,
      placeholder: input.placeholder,
      options: input.options || undefined,
    }));
  const cInputsToUpdate = cInputsIdsToDeleteOrUpdated.map((input) => ({
    data: {
      type: input.type,
      label: input.label,
      required: input.required,
      placeholder: input.placeholder,
      options: input.options || undefined,
    },
    where: {
      id: input.id,
    },
  }));

  return {
    deleteMany: {
      eventTypeId,
      NOT: {
        id: { in: cInputsIdsToDelete },
      },
    },
    createMany: {
      data: cInputsToCreate,
    },
    update: cInputsToUpdate,
  };
}

const EventTypeUpdateInput = _EventTypeModel
  /** Optional fields */
  .extend({
    customInputs: z.array(customInputSchema).optional(),
    destinationCalendar: _DestinationCalendarModel.pick({
      integration: true,
      externalId: true,
    }),
    users: z.array(stringOrNumber).optional(),
    hosts: z
      .array(
        z.object({
          userId: z.number(),
          isFixed: z.boolean().optional(),
        })
      )
      .optional(),
    schedule: z.number().nullable().optional(),
    hashedLink: z.string(),
  })
  .partial()
  .extend({
    metadata: EventTypeMetaDataSchema.optional(),
  })
  .merge(
    _EventTypeModel
      /** Required fields */
      .pick({
        id: true,
      })
  );

const EventTypeDuplicateInput = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  length: z.number(),
});

const eventOwnerProcedure = authedProcedure
  .input(
    z.object({
      id: z.number(),
      users: z.array(z.string()).optional().default([]),
    })
  )
  .use(async ({ ctx, input, next }) => {
    // Prevent non-owners to update/delete a team event
    const event = await ctx.prisma.eventType.findUnique({
      where: { id: input.id },
      include: {
        users: true,
        team: {
          select: {
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const isAuthorized = (function () {
      if (event.team) {
        return event.team.members
          .filter((member) => member.role === MembershipRole.OWNER || member.role === MembershipRole.ADMIN)
          .map((member) => member.userId)
          .includes(ctx.user.id);
      }
      return event.userId === ctx.user.id || event.users.find((user) => user.id === ctx.user.id);
    })();

    if (!isAuthorized) {
      console.warn(`User ${ctx.user.id} attempted to an access an event ${event.id} they do not own.`);
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const isAllowed = (function () {
      if (event.team) {
        const allTeamMembers = event.team.members.map((member) => member.userId);
        return input.users.every((userId: string) => allTeamMembers.includes(Number.parseInt(userId)));
      }
      return input.users.every((userId: string) => Number.parseInt(userId) === ctx.user.id);
    })();

    if (!isAllowed) {
      console.warn(
        `User ${ctx.user.id} attempted to an create an event for users ${input.users.join(", ")}.`
      );
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next();
  });

export const eventTypesRouter = router({
  // REVIEW: What should we name this procedure?
  getByViewer: authedProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
      // Position is required by lodash to sort on it. Don't remove it, TS won't complain but it would silently break reordering
      position: true,
      hashedLink: true,
      locations: true,
      destinationCalendar: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          // logo: true, // Skipping to avoid 4mb limit
          bio: true,
          hideBranding: true,
        },
      },
      metadata: true,
      users: {
        select: baseUserSelect,
      },
      hosts: {
        select: {
          user: {
            select: baseUserSelect,
          },
        },
      },
      seatsPerTimeSlot: true,
      ...baseEventTypeSelect,
    });

    const user = await prisma.user.findUnique({
      where: {
        id: ctx.user.id,
      },
      select: {
        id: true,
        username: true,
        name: true,
        startTime: true,
        endTime: true,
        bufferTime: true,
        avatar: true,
        teams: {
          where: {
            accepted: true,
          },
          select: {
            role: true,
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
                members: {
                  select: {
                    userId: true,
                  },
                },
                eventTypes: {
                  select: eventTypeSelect,
                  orderBy: [
                    {
                      position: "desc",
                    },
                    {
                      id: "asc",
                    },
                  ],
                },
              },
            },
          },
        },
        eventTypes: {
          where: {
            team: null,
          },
          select: eventTypeSelect,
          orderBy: [
            {
              position: "desc",
            },
            {
              id: "asc",
            },
          ],
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const mapEventType = (eventType: (typeof user.eventTypes)[number]) => ({
      ...eventType,
      users: !!eventType.hosts?.length ? eventType.hosts.map((host) => host.user) : eventType.users,
      // @FIXME: cc @hariombalhara This is failing with production data
      // metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
    });

    const userEventTypes = user.eventTypes.map(mapEventType);
    // backwards compatibility, TMP:
    const typesRaw = (
      await prisma.eventType.findMany({
        where: {
          userId: ctx.user.id,
        },
        select: eventTypeSelect,
        orderBy: [
          {
            position: "desc",
          },
          {
            id: "asc",
          },
        ],
      })
    ).map(mapEventType);

    type EventTypeGroup = {
      teamId?: number | null;
      profile: {
        slug: (typeof user)["username"];
        name: (typeof user)["name"];
        image?: string;
      };
      metadata: {
        membershipCount: number;
        readOnly: boolean;
      };
      eventTypes: typeof userEventTypes;
    };

    let eventTypeGroups: EventTypeGroup[] = [];
    const eventTypesHashMap = userEventTypes.concat(typesRaw).reduce((hashMap, newItem) => {
      const oldItem = hashMap[newItem.id];
      hashMap[newItem.id] = { ...oldItem, ...newItem };
      return hashMap;
    }, {} as Record<number, EventTypeGroup["eventTypes"][number]>);
    const mergedEventTypes = Object.values(eventTypesHashMap).map((eventType) => eventType);
    eventTypeGroups.push({
      teamId: null,
      profile: {
        slug: user.username,
        name: user.name,
        image: user.avatar || undefined,
      },
      eventTypes: _.orderBy(mergedEventTypes, ["position", "id"], ["desc", "asc"]),
      metadata: {
        membershipCount: 1,
        readOnly: false,
      },
    });

    eventTypeGroups = ([] as EventTypeGroup[]).concat(
      eventTypeGroups,
      user.teams.map((membership) => ({
        teamId: membership.team.id,
        profile: {
          name: membership.team.name,
          image: `${CAL_URL}/team/${membership.team.slug}/avatar.png`,
          slug: membership.team.slug ? "team/" + membership.team.slug : null,
        },
        metadata: {
          membershipCount: membership.team.members.length,
          readOnly: membership.role === MembershipRole.MEMBER,
        },
        eventTypes: membership.team.eventTypes.map(mapEventType),
      }))
    );
    return {
      // don't display event teams without event types,
      eventTypeGroups: eventTypeGroups.filter((groupBy) => !!groupBy.eventTypes?.length),
      // so we can show a dropdown when the user has teams
      profiles: eventTypeGroups.map((group) => ({
        teamId: group.teamId,
        ...group.profile,
        ...group.metadata,
      })),
    };
  }),
  list: authedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.eventType.findMany({
      where: {
        userId: ctx.user.id,
        team: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        length: true,
        schedulingType: true,
        slug: true,
        hidden: true,
        metadata: true,
      },
    });
  }),
  listWithTeam: authedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.eventType.findMany({
      where: {
        OR: [
          { userId: ctx.user.id },
          {
            team: {
              members: {
                some: {
                  userId: ctx.user.id,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        title: true,
        slug: true,
      },
    });
  }),
  create: authedProcedure.input(createEventTypeInput).mutation(async ({ ctx, input }) => {
    const { schedulingType, teamId, ...rest } = input;

    const userId = ctx.user.id;
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
      users: {
        connect: {
          id: userId,
        },
      },
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
  }),
  get: eventOwnerProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: ctx.user.id,
        },
        select: {
          id: true,
          username: true,
          name: true,
          startTime: true,
          endTime: true,
          bufferTime: true,
          avatar: true,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const res = await getEventTypeById({
        eventTypeId: input.id,
        userId: ctx.user.id,
        prisma: ctx.prisma,
        isTrpcCall: true,
      });

      return res;
    }),
  update: eventOwnerProcedure.input(EventTypeUpdateInput.strict()).mutation(async ({ ctx, input }) => {
    const {
      schedule,
      periodType,
      locations,
      bookingLimits,
      destinationCalendar,
      customInputs,
      recurringEvent,
      users,
      hosts,
      id,
      hashedLink,
      // Extract this from the input so it doesn't get saved in the db
      // eslint-disable-next-line
      userId,
      // eslint-disable-next-line
      teamId,
      bookingFields,
      ...rest
    } = input;

    ensureUniqueBookingFields(bookingFields);

    const data: Prisma.EventTypeUpdateInput = {
      ...rest,
      bookingFields,
      metadata: rest.metadata === null ? Prisma.DbNull : rest.metadata,
    };
    data.locations = locations ?? undefined;
    if (periodType) {
      data.periodType = handlePeriodType(periodType);
    }

    if (recurringEvent) {
      data.recurringEvent = {
        dstart: recurringEvent.dtstart as unknown as Prisma.InputJsonObject,
        interval: recurringEvent.interval,
        count: recurringEvent.count,
        freq: recurringEvent.freq,
        until: recurringEvent.until as unknown as Prisma.InputJsonObject,
        tzid: recurringEvent.tzid,
      };
    } else if (recurringEvent === null) {
      data.recurringEvent = Prisma.DbNull;
    }

    if (destinationCalendar) {
      /** We connect or create a destination calendar to the event type instead of the user */
      await viewerRouter.createCaller(ctx).setDestinationCalendar({
        ...destinationCalendar,
        eventTypeId: id,
      });
    }

    if (customInputs) {
      data.customInputs = handleCustomInputs(customInputs, id);
    }

    if (bookingLimits) {
      const isValid = validateBookingLimitOrder(bookingLimits);
      if (!isValid)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Booking limits must be in ascending order." });
      data.bookingLimits = bookingLimits;
    }

    if (schedule) {
      // Check that the schedule belongs to the user
      const userScheduleQuery = await ctx.prisma.schedule.findFirst({
        where: {
          userId: ctx.user.id,
          id: schedule,
        },
      });
      if (userScheduleQuery) {
        data.schedule = {
          connect: {
            id: schedule,
          },
        };
      }
    }
    // allows unsetting a schedule through { schedule: null, ... }
    else if (null === schedule) {
      data.schedule = {
        disconnect: true,
      };
    }

    if (users.length) {
      data.users = {
        set: [],
        connect: users.map((userId: number) => ({ id: userId })),
      };
    }

    if (hosts) {
      data.hosts = {
        deleteMany: {},
        create: hosts.map((host) => ({
          ...host,
          isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
        })),
      };
    }

    if (input?.price || input.metadata?.apps?.stripe?.price) {
      data.price = input.price || input.metadata?.apps?.stripe?.price;
      const paymentCredential = await ctx.prisma.credential.findFirst({
        where: {
          userId: ctx.user.id,
          type: {
            contains: "_payment",
          },
        },
        select: {
          type: true,
          key: true,
        },
      });

      if (paymentCredential?.type === "stripe_payment") {
        const { default_currency } = stripeDataSchema.parse(paymentCredential.key);
        data.currency = default_currency;
      }
    }

    const connectedLink = await ctx.prisma.hashedLink.findFirst({
      where: {
        eventTypeId: input.id,
      },
      select: {
        id: true,
      },
    });

    if (hashedLink) {
      // check if hashed connection existed. If it did, do nothing. If it didn't, add a new connection
      if (!connectedLink) {
        // create a hashed link
        await ctx.prisma.hashedLink.upsert({
          where: {
            eventTypeId: input.id,
          },
          update: {
            link: hashedLink,
          },
          create: {
            link: hashedLink,
            eventType: {
              connect: { id: input.id },
            },
          },
        });
      }
    } else {
      // check if hashed connection exists. If it does, disconnect
      if (connectedLink) {
        await ctx.prisma.hashedLink.delete({
          where: {
            eventTypeId: input.id,
          },
        });
      }
    }

    const eventType = await ctx.prisma.eventType.update({
      where: { id },
      data,
    });

    return { eventType };
  }),
  delete: eventOwnerProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      await ctx.prisma.eventTypeCustomInput.deleteMany({
        where: {
          eventTypeId: id,
        },
      });

      await ctx.prisma.eventType.delete({
        where: {
          id,
        },
      });

      return {
        id,
      };
    }),
  duplicate: eventOwnerProcedure.input(EventTypeDuplicateInput.strict()).mutation(async ({ ctx, input }) => {
    try {
      const {
        id: originalEventTypeId,
        title: newEventTitle,
        slug: newSlug,
        description: newDescription,
        length: newLength,
      } = input;
      const eventType = await ctx.prisma.eventType.findUnique({
        where: {
          id: originalEventTypeId,
        },
        include: {
          customInputs: true,
          schedule: true,
          users: true,
          team: true,
          workflows: true,
          webhooks: true,
        },
      });

      if (!eventType) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Validate user is owner of event type or in the team
      if (eventType.userId !== ctx.user.id) {
        if (eventType.teamId) {
          const isMember = await ctx.prisma.membership.findFirst({
            where: {
              userId: ctx.user.id,
              teamId: eventType.teamId,
            },
          });
          if (!isMember) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
      }

      const {
        customInputs,
        users,
        locations,
        team,
        recurringEvent,
        bookingLimits,
        metadata,
        workflows,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        id: _id,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        webhooks: _webhooks,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        schedule: _schedule,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment
        // @ts-ignore - descriptionAsSafeHTML is added on the fly using a prisma middleware it shouldn't be used to create event type. Such a property doesn't exist on schema
        descriptionAsSafeHTML: _descriptionAsSafeHTML,
        ...rest
      } = eventType;

      const data: Prisma.EventTypeUncheckedCreateInput = {
        ...rest,
        title: newEventTitle,
        slug: newSlug,
        description: newDescription,
        length: newLength,
        locations: locations ?? undefined,
        teamId: team ? team.id : undefined,
        users: users ? { connect: users.map((user) => ({ id: user.id })) } : undefined,
        recurringEvent: recurringEvent || undefined,
        bookingLimits: bookingLimits ?? undefined,
        metadata: metadata === null ? Prisma.DbNull : metadata,
        bookingFields: eventType.bookingFields === null ? Prisma.DbNull : eventType.bookingFields,
      };

      const newEventType = await ctx.prisma.eventType.create({ data });

      // Create custom inputs
      if (customInputs) {
        const customInputsData = customInputs.map((customInput) => {
          const { id: _, options, ...rest } = customInput;
          return {
            options: options ?? undefined,
            ...rest,
            eventTypeId: newEventType.id,
          };
        });
        await ctx.prisma.eventTypeCustomInput.createMany({
          data: customInputsData,
        });
      }

      if (workflows.length > 0) {
        const relationCreateData = workflows.map((workflow) => {
          return { eventTypeId: newEventType.id, workflowId: workflow.workflowId };
        });

        await ctx.prisma.workflowsOnEventTypes.createMany({
          data: relationCreateData,
        });
      }

      return {
        eventType: newEventType,
      };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),
  bulkEventFetch: authedProcedure.query(async ({ ctx }) => {
    const eventTypes = await ctx.prisma.eventType.findMany({
      where: {
        userId: ctx.user.id,
        team: null,
      },
      select: {
        id: true,
        title: true,
        locations: true,
      },
    });

    const eventTypesWithLogo = eventTypes.map((eventType) => {
      const locationParsed = eventTypeLocationsSchema.safeParse(eventType.locations);

      // some events has null as location for legacy reasons, so this fallbacks to daily video
      const app = getAppFromLocationValue(
        locationParsed.success && locationParsed.data?.[0]?.type
          ? locationParsed.data[0].type
          : "integrations:daily"
      );
      return {
        ...eventType,
        logo: app?.logo,
      };
    });

    return {
      eventTypes: eventTypesWithLogo,
    };
  }),

  bulkUpdateToDefaultLocation: authedProcedure
    .input(
      z.object({
        eventTypeIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventTypeIds } = input;
      const defaultApp = userMetadataSchema.parse(ctx.user.metadata)?.defaultConferencingApp;

      if (!defaultApp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Default conferencing app not set",
        });
      }

      const foundApp = getAppFromSlug(defaultApp.appSlug);
      const appType = foundApp?.appData?.location?.type;
      if (!appType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Default conferencing app '${defaultApp.appSlug}' doesnt exist.`,
        });
      }

      return await ctx.prisma.eventType.updateMany({
        where: {
          id: {
            in: eventTypeIds,
          },
          userId: ctx.user.id,
        },
        data: {
          locations: [{ type: appType, link: defaultApp.appLink }] as LocationObject[],
        },
      });
    }),
});

function ensureUniqueBookingFields(fields: z.infer<typeof EventTypeUpdateInput>["bookingFields"]) {
  if (!fields) {
    return;
  }
  fields.reduce((discoveredFields, field) => {
    if (discoveredFields[field.name]) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Duplicate booking field name: ${field.name}`,
      });
    }
    discoveredFields[field.name] = true;
    return discoveredFields;
  }, {} as Record<string, true>);
}
