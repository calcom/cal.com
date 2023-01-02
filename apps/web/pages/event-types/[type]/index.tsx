/* eslint-disable @typescript-eslint/no-empty-function */
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { PeriodType, SchedulingType } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EventLocationType } from "@calcom/core/location";
import { validateBookingLimitOrder } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import convertToNewDurationType from "@calcom/lib/convertToNewDurationType";
import findDurationType from "@calcom/lib/findDurationType";
import getEventTypeById from "@calcom/lib/getEventTypeById";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { trpc, RouterOutputs } from "@calcom/trpc/react";
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

export type EventTypeSetupProps = RouterOutputs["viewer"]["eventTypes"]["get"];

const EventTypePage = (props: EventTypeSetupProps) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();
  const { tabName } = querySchema.parse(router.query);

  const { data: eventTypeApps } = trpc.viewer.apps.useQuery({
    extendsFeature: "EventType",
  });

  const { eventType, locationOptions, team, teamMembers, currentUserMembership } = props;

  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async () => {
      showToast(
        t("event_type_updated_successfully", {
          eventTypeTitle: eventType.title,
        }),
        "success"
      );
    },
    async onSettled() {
      await utils.viewer.eventTypes.get.invalidate();
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
    team: <EventTeamTab eventType={eventType} teamMembers={teamMembers} team={team} />,
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
      currentUserMembership={currentUserMembership}>
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

const EventTypePageWrapper = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { data, isLoading } = trpc.viewer.eventTypes.get.useQuery(
    { id: props.type },
    {
      initialData: props.initialData,
    }
  );

  if (isLoading || !data) return null;
  return <EventTypePage {...data} />;
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

  try {
    const res = await getEventTypeById({ eventTypeId: typeParam, userId: session.user.id, prisma });
    return {
      props: {
        session,
        type: typeParam,
        trpcState: ssr.dehydrate(),
        initialData: {
          eventType: res.eventType,
          locationOptions: res.locationOptions,
          team: res.team,
          teamMembers: res.teamMembers,
          currentUserMembership: res.currentUserMembership,
        },
      },
    };
  } catch (err) {
    return {
      notFound: true,
    };
  }
};

export default EventTypePageWrapper;
