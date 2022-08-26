import { EventTypeCustomInput, PeriodType, Prisma, SchedulingType } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { JSONObject } from "superjson/dist/types";
import { z } from "zod";

import { StripeData } from "@calcom/app-store/stripepayment/lib/server";
import getApps, { getLocationOptions } from "@calcom/app-store/utils";
import { LocationObject, EventLocationType } from "@calcom/core/location";
import { parseRecurringEvent } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Form } from "@calcom/ui/form/fields";
import { Button, showToast } from "@calcom/ui/v2";

import { asStringOrThrow } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";
import { inferSSRProps } from "@lib/types/inferSSRProps";

// These can't really be moved into calcom/ui due to the fact they use infered getserverside props typings
import { EventAdvancedTab } from "@components/v2/eventtype/EventAdvancedTab";
import { EventAppsTab } from "@components/v2/eventtype/EventAppsTab";
import { EventLimitsTab } from "@components/v2/eventtype/EventLimitsTab";
import { EventRecurringTab } from "@components/v2/eventtype/EventRecurringTab";
import { EventSetupTab } from "@components/v2/eventtype/EventSetupTab";
import { EventTeamTab } from "@components/v2/eventtype/EventTeamTab";
import { EventTypeSingleLayout } from "@components/v2/eventtype/EventTypeSingleLayout";

import { getTranslation } from "@server/lib/i18n";

export type FormValues = {
  title: string;
  eventTitle: string;
  smartContractAddress: string;
  eventName: string;
  slug: string;
  length: number;
  description: string;
  disableGuests: boolean;
  requiresConfirmation: boolean;
  recurringEvent: RecurringEvent | null;
  schedulingType: SchedulingType | null;
  price: number;
  currency: string;
  hidden: boolean;
  hideCalendarNotes: boolean;
  hashedLink: string | undefined;
  locations: {
    type: EventLocationType["type"];
    address?: string;
    link?: string;
    hostPhoneNumber?: string;
    displayLocationPublicly?: boolean;
  }[];
  customInputs: EventTypeCustomInput[];
  users: string[];
  schedule: number;
  periodType: PeriodType;
  periodDays: number;
  periodCountCalendarDays: "1" | "0";
  periodDates: { startDate: Date; endDate: Date };
  seatsPerTimeSlot: number | null;
  minimumBookingNotice: number;
  beforeBufferTime: number;
  afterBufferTime: number;
  slotInterval: number | null;
  destinationCalendar: {
    integration: string;
    externalId: string;
  };
  successRedirectUrl: string;
  giphyThankYouPage: string;
};

const querySchema = z.object({
  tabName: z
    .enum(["setup", "availability", "apps", "limits", "recurring", "team", "advanced"])
    .optional()
    .default("setup"),
});

export type EventTypeSetupInfered = inferSSRProps<typeof getServerSideProps>;

const EventTypePage = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();

  const { eventType, locationOptions, team, teamMembers } = props;

  const router = useRouter();
  const { tabName } = querySchema.parse(router.query);
  const updateMutation = trpc.useMutation("viewer.eventTypes.update", {
    onSuccess: async ({ eventType }) => {
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

      if (err.data?.code === "PARSE_ERROR") {
        message = `${err.data.code}: ${err.message}`;
      }

      if (message) {
        showToast(message, "error");
      }
    },
  });

  const [periodDates] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(eventType.periodStartDate || Date.now()),
    endDate: new Date(eventType.periodEndDate || Date.now()),
  });

  const formMethods = useForm<FormValues>({
    defaultValues: {
      title: eventType.title,
      locations: eventType.locations || [],
      recurringEvent: eventType.recurringEvent || null,
      description: eventType.description ?? undefined,
      schedule: eventType.schedule?.id,
      hidden: eventType.hidden,
      periodDates: {
        startDate: periodDates.startDate,
        endDate: periodDates.endDate,
      },
      schedulingType: eventType.schedulingType,
    },
  });

  const tabMap = {
    setup: (
      <EventSetupTab
        eventType={eventType}
        locationOptions={locationOptions}
        team={team}
        teamMembers={teamMembers}
      />
    ),
    /* TODO: Actually make this tab */
    availability: null,
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
    recurring: (
      <EventRecurringTab eventType={eventType} hasPaymentIntegration={props.hasPaymentIntegration} />
    ),
    apps: (
      <EventAppsTab
        currency={props.currency}
        eventType={eventType}
        hasPaymentIntegration={props.hasPaymentIntegration}
        hasGiphyIntegration={props.hasGiphyIntegration}
      />
    ),
  } as const;

  return (
    <EventTypeSingleLayout
      enabledAppsNumber={[props.hasGiphyIntegration, props.hasPaymentIntegration].filter(Boolean).length}
      eventType={eventType}
      team={team}
      formMethods={formMethods}
      disableBorder={tabName === "apps"}
      currentUserMembership={props.currentUserMembership}>
      <Form
        form={formMethods}
        id="event-type-form"
        handleSubmit={async (values) => {
          const {
            periodDates,
            periodCountCalendarDays,
            smartContractAddress,
            giphyThankYouPage,
            beforeBufferTime,
            afterBufferTime,
            seatsPerTimeSlot,
            recurringEvent,
            locations,
            ...input
          } = values;

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
            seatsPerTimeSlot,
            metadata: {
              ...(smartContractAddress ? { smartContractAddress } : {}),
              ...(giphyThankYouPage ? { giphyThankYouPage } : {}),
            },
          });
        }}
        className="space-y-6">
        {tabMap[tabName]}
        <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
          <Button href="/event-types" color="secondary" tabIndex={-1}>
            {t("cancel")}
          </Button>
          <Button type="submit" data-testid="update-eventtype" disabled={updateMutation.isLoading}>
            {t("update")}
          </Button>
        </div>
      </Form>
    </EventTypeSingleLayout>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, query } = context;
  const session = await getSession({ req });
  const typeParam = parseInt(asStringOrThrow(query.type));

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
    plan: true,
    locale: true,
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
      availability: true,
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
      successRedirectUrl: true,
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
      currency: true,
      destinationCalendar: true,
      seatsPerTimeSlot: true,
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
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      appId: true,
    },
  });

  const web3Credentials = credentials.find((credential) => credential.type.includes("_web3"));
  const { locations, metadata, ...restEventType } = rawEventType;
  const eventType = {
    ...restEventType,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    locations: locations as unknown as LocationObject[],
    metadata: (metadata || {}) as JSONObject,
    isWeb3Active:
      web3Credentials && web3Credentials.key
        ? (((web3Credentials.key as JSONObject).isWeb3Active || false) as boolean)
        : false,
  };

  const hasGiphyIntegration = !!credentials.find((credential) => credential.type === "giphy_other");

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
  const integrations = getApps(credentials);
  const locationOptions = getLocationOptions(integrations, t);
  const hasPaymentIntegration = !!credentials.find((credential) => credential.type === "stripe_payment");
  const currency =
    (credentials.find((integration) => integration.type === "stripe_payment")?.key as unknown as StripeData)
      ?.default_currency || "usd";

  type Availability = typeof eventType["availability"];
  const getAvailability = (availability: Availability) =>
    availability?.length
      ? availability.map((schedule) => ({
          ...schedule,
          startTime: new Date(new Date().toDateString() + " " + schedule.startTime.toTimeString()).valueOf(),
          endTime: new Date(new Date().toDateString() + " " + schedule.endTime.toTimeString()).valueOf(),
        }))
      : null;

  const availability = getAvailability(eventType.availability) || [];
  availability.sort((a, b) => a.startTime - b.startTime);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    availability,
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
      availability,
      team: eventTypeObject.team || null,
      teamMembers,
      hasPaymentIntegration,
      hasGiphyIntegration,
      currency,
      currentUserMembership,
    },
  };
};

export default EventTypePage;
