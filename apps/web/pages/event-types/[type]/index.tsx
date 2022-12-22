/* eslint-disable @typescript-eslint/no-empty-function */
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { PeriodType, Prisma, SchedulingType } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { StripeData } from "@calcom/app-store/stripepayment/lib/server";
import { getEventTypeAppData, getLocationOptions } from "@calcom/app-store/utils";
import { EventLocationType, LocationObject } from "@calcom/core/location";
import { parseBookingLimit, parseRecurringEvent, validateBookingLimitOrder } from "@calcom/lib";
import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { CAL_URL } from "@calcom/lib/constants";
import convertToNewDurationType from "@calcom/lib/convertToNewDurationType";
import findDurationType from "@calcom/lib/findDurationType";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { BookingLimit, RecurringEvent } from "@calcom/types/Calendar";
import { Form, showToast } from "@calcom/ui";

import { asStringOrThrow } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { AvailabilityTab } from "@components/eventtype/AvailabilityTab";
// These can't really be moved into calcom/ui due to the fact they use infered getserverside props typings
import { EventAdvancedTab } from "@components/eventtype/EventAdvancedTab";
import { EventAppsTab } from "@components/eventtype/EventAppsTab";
import { EventLimitsTab } from "@components/eventtype/EventLimitsTab";
import { EventRecurringTab } from "@components/eventtype/EventRecurringTab";
import { EventSetupTab } from "@components/eventtype/EventSetupTab";
import { EventTeamTab } from "@components/eventtype/EventTeamTab";
import { EventTeamWebhooksTab } from "@components/eventtype/EventTeamWebhooksTab";
import { EventTypeSingleLayout } from "@components/eventtype/EventTypeSingleLayout";
import EventWorkflowsTab from "@components/eventtype/EventWorkfowsTab";

import { getTranslation } from "@server/lib/i18n";
import { ssrInit } from "@server/lib/ssr";

export type FormValues = {
  title: string;
  eventTitle: string;
  eventName: string;
  slug: string;
  length: number;
  description: string;
  disableGuests: boolean;
  requiresConfirmation: boolean;
  recurringEvent: RecurringEvent | null;
  schedulingType: SchedulingType | null;
  hidden: boolean;
  hideCalendarNotes: boolean;
  hashedLink: string | undefined;
  locations: {
    type: EventLocationType["type"];
    address?: string;
    attendeeAddress?: string;
    link?: string;
    hostPhoneNumber?: string;
    displayLocationPublicly?: boolean;
    phone?: string;
  }[];
  customInputs: CustomInputParsed[];
  users: string[];
  schedule: number;
  periodType: PeriodType;
  periodDays: number;
  periodCountCalendarDays: "1" | "0";
  periodDates: { startDate: Date; endDate: Date };
  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean | null;
  seatsPerTimeSlotEnabled: boolean;
  minimumBookingNotice: number;
  minimumBookingNoticeInDurationType: number;
  beforeBufferTime: number;
  afterBufferTime: number;
  slotInterval: number | null;
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
  destinationCalendar: {
    integration: string;
    externalId: string;
  };
  successRedirectUrl: string;
  bookingLimits?: BookingLimit;
};

export type CustomInputParsed = typeof customInputSchema._output;

const querySchema = z.object({
  tabName: z
    .enum([
      "setup",
      "availability",
      "apps",
      "limits",
      "recurring",
      "team",
      "advanced",
      "workflows",
      "webhooks",
    ])
    .optional()
    .default("setup"),
});

export type EventTypeSetupInfered = inferSSRProps<typeof getServerSideProps>;

const EventTypePage = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();
  const { data: eventTypeApps } = trpc.viewer.apps.useQuery({
    extendsFeature: "EventType",
  });

  const { eventType: dbEventType, locationOptions, team, teamMembers } = props;
  // TODO: It isn't a good idea to maintain state using setEventType. If we want to connect the SSR'd data to tRPC, we should useQuery(["viewer.eventTypes.get"]) with initialData
  // Due to this change, when Form is saved, there is no way to propagate that info to eventType (e.g. disabling stripe app doesn't allow recurring tab to be enabled without refresh).
  const [eventType, setEventType] = useState(dbEventType);

  const router = useRouter();
  const { tabName } = querySchema.parse(router.query);

  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async ({ eventType: newEventType }) => {
      setEventType({ ...eventType, slug: newEventType.slug });
      showToast(
        t("event_type_updated_successfully", {
          eventTypeTitle: eventType.title,
        }),
        "success"
      );
    },
    onError: (err) => {
      let message = "";
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        message = `${err.data.code}: You are not able to update this event`;
      }

      if (err.data?.code === "PARSE_ERROR" || err.data?.code === "BAD_REQUEST") {
        message = `${err.data.code}: ${err.message}`;
      }

      if (message) {
        showToast(message, "error");
      } else {
        showToast(err.message, "error");
      }
    },
  });

  const [periodDates] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(eventType.periodStartDate || Date.now()),
    endDate: new Date(eventType.periodEndDate || Date.now()),
  });

  const metadata = eventType.metadata;
  // fallback to !!eventType.schedule when 'useHostSchedulesForTeamEvent' is undefined
  if (!!team) {
    metadata.config = {
      ...metadata.config,
      useHostSchedulesForTeamEvent:
        typeof eventType.metadata.config?.useHostSchedulesForTeamEvent !== "undefined"
          ? eventType.metadata.config?.useHostSchedulesForTeamEvent === true
          : !!eventType.schedule,
    };
  } else {
    // Make sure non-team events NEVER have this config key;
    delete metadata.config?.useHostSchedulesForTeamEvent;
  }

  const formMethods = useForm<FormValues>({
    defaultValues: {
      title: eventType.title,
      locations: eventType.locations || [],
      recurringEvent: eventType.recurringEvent || null,
      description: eventType.description ?? undefined,
      schedule: eventType.schedule || undefined,
      bookingLimits: eventType.bookingLimits || undefined,
      hidden: eventType.hidden,
      periodDates: {
        startDate: periodDates.startDate,
        endDate: periodDates.endDate,
      },
      periodType: eventType.periodType,
      periodCountCalendarDays: eventType.periodCountCalendarDays ? "1" : "0",
      schedulingType: eventType.schedulingType,
      minimumBookingNotice: eventType.minimumBookingNotice,
      minimumBookingNoticeInDurationType: convertToNewDurationType(
        "minutes",
        findDurationType(eventType.minimumBookingNotice),
        eventType.minimumBookingNotice
      ),
      metadata,
    },
    resolver: zodResolver(
      z
        .object({
          // Length if string, is converted to a number or it can be a number
          // Make it optional because it's not submitted from all tabs of the page
          length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
        })
        // TODO: Add schema for other fields later.
        .passthrough()
    ),
  });

  const appsMetadata = formMethods.getValues("metadata")?.apps;
  const numberOfInstalledApps = eventTypeApps?.filter((app) => app.isInstalled).length || 0;
  let numberOfActiveApps = 0;

  if (appsMetadata) {
    numberOfActiveApps = Object.entries(appsMetadata).filter(
      ([appId, appData]) => eventTypeApps?.find((app) => app.slug === appId)?.isInstalled && appData.enabled
    ).length;
  }

  const permalink = `${CAL_URL}/${team ? `team/${team.slug}` : eventType.users[0].username}/${
    eventType.slug
  }`;

  const tabMap = {
    setup: (
      <EventSetupTab
        eventType={eventType}
        locationOptions={locationOptions}
        team={team}
        teamMembers={teamMembers}
      />
    ),
    availability: <AvailabilityTab isTeamEvent={!!team} />,
    team: (
      <EventTeamTab
        eventType={eventType}
        teamMembers={teamMembers}
        team={team}
        currentUserMembership={props.currentUserMembership}
      />
    ),
    limits: <EventLimitsTab eventType={eventType} />,
    advanced: <EventAdvancedTab eventType={eventType} team={team} />,
    recurring: <EventRecurringTab eventType={eventType} />,
    apps: <EventAppsTab eventType={{ ...eventType, URL: permalink }} />,
    workflows: (
      <EventWorkflowsTab
        eventType={eventType}
        workflows={eventType.workflows.map((workflowOnEventType) => workflowOnEventType.workflow)}
      />
    ),
    webhooks: <EventTeamWebhooksTab eventType={eventType} team={team} />,
  } as const;

  return (
    <EventTypeSingleLayout
      enabledAppsNumber={numberOfActiveApps}
      installedAppsNumber={numberOfInstalledApps}
      enabledWorkflowsNumber={eventType.workflows.length}
      eventType={eventType}
      team={team}
      isUpdateMutationLoading={updateMutation.isLoading}
      formMethods={formMethods}
      disableBorder={tabName === "apps" || tabName === "workflows" || tabName === "webhooks"}
      currentUserMembership={props.currentUserMembership}>
      <Form
        form={formMethods}
        id="event-type-form"
        handleSubmit={async (values) => {
          const {
            periodDates,
            periodCountCalendarDays,
            beforeBufferTime,
            afterBufferTime,
            seatsPerTimeSlot,
            seatsShowAttendees,
            bookingLimits,
            recurringEvent,
            locations,
            metadata,
            customInputs,
            // We don't need to send send these values to the backend
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            seatsPerTimeSlotEnabled,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            minimumBookingNoticeInDurationType,
            ...input
          } = values;

          if (bookingLimits) {
            const isValid = validateBookingLimitOrder(bookingLimits);
            if (!isValid) throw new Error(t("event_setup_booking_limits_error"));
          }

          if (metadata?.multipleDuration !== undefined) {
            if (metadata?.multipleDuration.length < 1) {
              throw new Error(t("event_setup_multiple_duration_error"));
            } else {
              if (!input.length && !metadata?.multipleDuration?.includes(input.length)) {
                throw new Error(t("event_setup_multiple_duration_default_error"));
              }
            }
          }

          updateMutation.mutate({
            ...input,
            locations,
            recurringEvent,
            periodStartDate: periodDates.startDate,
            periodEndDate: periodDates.endDate,
            periodCountCalendarDays: periodCountCalendarDays === "1",
            id: eventType.id,
            beforeEventBuffer: beforeBufferTime,
            afterEventBuffer: afterBufferTime,
            bookingLimits,
            seatsPerTimeSlot,
            seatsShowAttendees,
            metadata,
            customInputs,
          });
        }}>
        <div ref={animationParentRef} className="space-y-6">
          {tabMap[tabName]}
        </div>
      </Form>
    </EventTypeSingleLayout>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;
  const session = await getSession({ req });
  const typeParam = parseInt(asStringOrThrow(query.type));
  const ssr = await ssrInit(context);

  if (Number.isNaN(typeParam)) {
    return {
      notFound: true,
    };
  }

  if (!session?.user?.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    name: true,
    username: true,
    id: true,
    avatar: true,
    email: true,
    locale: true,
    defaultScheduleId: true,
  });

  const rawEventType = await prisma.eventType.findFirst({
    where: {
      AND: [
        {
          OR: [
            {
              users: {
                some: {
                  id: session.user.id,
                },
              },
            },
            {
              team: {
                members: {
                  some: {
                    userId: session.user.id,
                  },
                },
              },
            },
            {
              userId: session.user.id,
            },
          ],
        },
        {
          id: typeParam,
        },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      hidden: true,
      locations: true,
      eventName: true,
      customInputs: true,
      timeZone: true,
      periodType: true,
      metadata: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      recurringEvent: true,
      hideCalendarNotes: true,
      disableGuests: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      slotInterval: true,
      hashedLink: true,
      bookingLimits: true,
      successRedirectUrl: true,
      currency: true,
      team: {
        select: {
          id: true,
          slug: true,
          members: {
            where: {
              accepted: true,
            },
            select: {
              role: true,
              user: {
                select: userSelect,
              },
            },
          },
        },
      },
      users: {
        select: userSelect,
      },
      schedulingType: true,
      schedule: {
        select: {
          id: true,
        },
      },
      userId: true,
      price: true,
      destinationCalendar: true,
      seatsPerTimeSlot: true,
      seatsShowAttendees: true,
      webhooks: {
        select: {
          id: true,
          subscriberUrl: true,
          payloadTemplate: true,
          active: true,
          eventTriggers: true,
          secret: true,
          eventTypeId: true,
        },
      },
      workflows: {
        include: {
          workflow: {
            include: {
              activeOn: {
                select: {
                  eventType: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
              steps: true,
            },
          },
        },
      },
    },
  });

  if (!rawEventType) {
    return {
      notFound: true,
    };
  }

  const credentials = await prisma.credential.findMany({
    where: {
      userId: session.user.id,
      app: {
        enabled: true,
      },
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      appId: true,
      invalid: true,
    },
  });

  const { locations, metadata, ...restEventType } = rawEventType;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const newMetadata = EventTypeMetaDataSchema.parse(metadata || {})!;
  const apps = newMetadata.apps || {};
  const eventTypeWithParsedMetadata = { ...rawEventType, metadata: newMetadata };
  newMetadata.apps = {
    ...apps,
    stripe: {
      ...getStripeAppData(eventTypeWithParsedMetadata, true),
      currency:
        (
          credentials.find((integration) => integration.type === "stripe_payment")
            ?.key as unknown as StripeData
        )?.default_currency || "usd",
    },
    giphy: getEventTypeAppData(eventTypeWithParsedMetadata, "giphy", true),
    rainbow: getEventTypeAppData(eventTypeWithParsedMetadata, "rainbow", true),
  };

  // TODO: How to extract metadata schema from _EventTypeModel to be able to parse it?
  // const parsedMetaData = _EventTypeModel.parse(newMetadata);
  const parsedMetaData = newMetadata;

  const parsedCustomInputs = (rawEventType.customInputs || []).map((input) => customInputSchema.parse(input));

  const eventType = {
    ...restEventType,
    schedule: rawEventType.schedule?.id || rawEventType.users[0]?.defaultScheduleId || null,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    bookingLimits: parseBookingLimit(restEventType.bookingLimits),
    locations: locations as unknown as LocationObject[],
    metadata: parsedMetaData,
    customInputs: parsedCustomInputs,
  };

  // backwards compat
  if (eventType.users.length === 0 && !eventType.team) {
    const fallbackUser = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: userSelect,
    });
    if (!fallbackUser) throw Error("The event type doesn't have user and no fallback user was found");
    eventType.users.push(fallbackUser);
  }
  const currentUser = eventType.users.find((u) => u.id === session.user.id);
  const t = await getTranslation(currentUser?.locale ?? "en", "common");
  const integrations = await getEnabledApps(credentials);
  const locationOptions = getLocationOptions(integrations, t);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  const teamMembers = eventTypeObject.team
    ? eventTypeObject.team.members.map((member) => {
        const user = member.user;
        user.avatar = `${CAL_URL}/${user.username}/avatar.png`;
        return user;
      })
    : [];

  // Find the current users memebership so we can check role to enable/disable deletion.
  // Sets to null if no membership is found - this must mean we are in a none team event type
  const currentUserMembership =
    eventTypeObject.team?.members.find((el) => el.user.id === session.user.id) ?? null;

  return {
    props: {
      session,
      eventType: eventTypeObject,
      locationOptions,
      team: eventTypeObject.team || null,
      teamMembers,
      currentUserMembership,
      trpcState: ssr.dehydrate(),
    },
  };
};

export default EventTypePage;
