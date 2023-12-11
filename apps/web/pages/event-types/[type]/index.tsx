/* eslint-disable @typescript-eslint/no-empty-function */
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getEventLocationType } from "@calcom/app-store/locations";
import { validateCustomEventName } from "@calcom/core/event";
import type { EventLocationType } from "@calcom/core/location";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { validateIntervalLimitOrder } from "@calcom/lib";
import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { Prisma } from "@calcom/prisma/client";
import type { PeriodType, SchedulingType } from "@calcom/prisma/enums";
import type {
  BookerLayoutSettings,
  customInputSchema,
  EventTypeMetaDataSchema,
} from "@calcom/prisma/zod-utils";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { IntervalLimit, RecurringEvent } from "@calcom/types/Calendar";
import { Form, showToast } from "@calcom/ui";

import { asStringOrThrow } from "@lib/asStringOrNull";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import PageWrapper from "@components/PageWrapper";
import type { AvailabilityOption } from "@components/eventtype/EventAvailabilityTab";
import { EventTypeSingleLayout } from "@components/eventtype/EventTypeSingleLayout";

import { ssrInit } from "@server/lib/ssr";

// These can't really be moved into calcom/ui due to the fact they use infered getserverside props typings;
const EventSetupTab = dynamic(() =>
  import("@components/eventtype/EventSetupTab").then((mod) => mod.EventSetupTab)
);

const EventAvailabilityTab = dynamic(() =>
  import("@components/eventtype/EventAvailabilityTab").then((mod) => mod.EventAvailabilityTab)
);

const EventTeamTab = dynamic(() =>
  import("@components/eventtype/EventTeamTab").then((mod) => mod.EventTeamTab)
);

const EventLimitsTab = dynamic(() =>
  import("@components/eventtype/EventLimitsTab").then((mod) => mod.EventLimitsTab)
);

const EventAdvancedTab = dynamic(() =>
  import("@components/eventtype/EventAdvancedTab").then((mod) => mod.EventAdvancedTab)
);

const EventRecurringTab = dynamic(() =>
  import("@components/eventtype/EventRecurringTab").then((mod) => mod.EventRecurringTab)
);

const EventAppsTab = dynamic(() =>
  import("@components/eventtype/EventAppsTab").then((mod) => mod.EventAppsTab)
);

const EventWorkflowsTab = dynamic(() => import("@components/eventtype/EventWorkfowsTab"));

const EventWebhooksTab = dynamic(() =>
  import("@components/eventtype/EventWebhooksTab").then((mod) => mod.EventWebhooksTab)
);

const ManagedEventTypeDialog = dynamic(() => import("@components/eventtype/ManagedEventDialog"));

export type FormValues = {
  title: string;
  eventTitle: string;
  eventName: string;
  slug: string;
  length: number;
  offsetStart: number;
  description: string;
  disableGuests: boolean;
  lockTimeZoneToggleOnBookingPage: boolean;
  requiresConfirmation: boolean;
  requiresBookerEmailVerification: boolean;
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
    hostDefault?: string;
    credentialId?: number;
    teamName?: string;
  }[];
  customInputs: CustomInputParsed[];
  schedule: number | null;
  periodType: PeriodType;
  periodDays: number;
  periodCountCalendarDays: "1" | "0";
  periodDates: { startDate: Date; endDate: Date };
  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean | null;
  seatsShowAvailabilityCount: boolean | null;
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
  durationLimits?: IntervalLimit;
  bookingLimits?: IntervalLimit;
  onlyShowFirstAvailableSlot: boolean;
  children: ChildrenEventType[];
  hosts: { userId: number; isFixed: boolean }[];
  bookingFields: z.infer<typeof eventTypeBookingFields>;
  availability?: AvailabilityOption;
  bookerLayouts: BookerLayoutSettings;
  multipleDurationEnabled: boolean;
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
export type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];

const EventTypePage = (props: EventTypeSetupProps) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const telemetry = useTelemetry();
  const {
    data: { tabName },
  } = useTypedQuery(querySchema);

  const { data: eventTypeApps } = trpc.viewer.integrations.useQuery({
    extendsFeature: "EventType",
    teamId: props.eventType.team?.id || props.eventType.parent?.teamId,
    onlyInstalled: true,
  });

  const { eventType, locationOptions, team, teamMembers, currentUserMembership, destinationCalendar } = props;
  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async () => {
      formMethods.setValue(
        "children",
        formMethods.getValues().children.map((child) => ({
          ...child,
          created: true,
        }))
      );
      showToast(t("event_type_updated_successfully", { eventTypeTitle: eventType.title }), "success");
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
        message = `${err.data.code}: ${t("error_event_type_unauthorized_update")}`;
      }

      if (err.data?.code === "PARSE_ERROR" || err.data?.code === "BAD_REQUEST") {
        message = `${err.data.code}: ${t(err.message)}`;
      }

      if (err.data?.code === "INTERNAL_SERVER_ERROR") {
        message = t("unexpected_error_try_again");
      }

      showToast(message ? t(message) : t(err.message), "error");
    },
  });

  const [periodDates] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(eventType.periodStartDate || Date.now()),
    endDate: new Date(eventType.periodEndDate || Date.now()),
  });

  const metadata = eventType.metadata;
  // fallback to !!eventType.schedule when 'useHostSchedulesForTeamEvent' is undefined
  if (!!team && metadata !== null) {
    metadata.config = {
      ...metadata.config,
      useHostSchedulesForTeamEvent:
        typeof eventType.metadata?.config?.useHostSchedulesForTeamEvent !== "undefined"
          ? eventType.metadata?.config?.useHostSchedulesForTeamEvent === true
          : !!eventType.schedule,
    };
  } else {
    // Make sure non-team events NEVER have this config key;
    delete metadata?.config?.useHostSchedulesForTeamEvent;
  }

  const bookingFields: Prisma.JsonObject = {};

  eventType.bookingFields.forEach(({ name }) => {
    bookingFields[name] = name;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultValues: any = useMemo(() => {
    return {
      title: eventType.title,
      locations: eventType.locations || [],
      recurringEvent: eventType.recurringEvent || null,
      description: eventType.description ?? undefined,
      schedule: eventType.schedule || undefined,
      bookingLimits: eventType.bookingLimits || undefined,
      onlyShowFirstAvailableSlot: eventType.onlyShowFirstAvailableSlot || undefined,
      durationLimits: eventType.durationLimits || undefined,
      length: eventType.length,
      hidden: eventType.hidden,
      hashedLink: eventType.hashedLink?.link || undefined,
      periodDates: {
        startDate: periodDates.startDate,
        endDate: periodDates.endDate,
      },
      offsetStart: eventType.offsetStart,
      bookingFields: eventType.bookingFields,
      periodType: eventType.periodType,
      periodCountCalendarDays: eventType.periodCountCalendarDays ? "1" : "0",
      schedulingType: eventType.schedulingType,
      minimumBookingNotice: eventType.minimumBookingNotice,
      metadata,
      hosts: eventType.hosts,
      children: eventType.children.map((ch) => ({
        ...ch,
        created: true,
        owner: {
          ...ch.owner,
          eventTypeSlugs:
            eventType.team?.members
              .find((mem) => mem.user.id === ch.owner.id)
              ?.user.eventTypes.map((evTy) => evTy.slug)
              .filter((slug) => slug !== eventType.slug) ?? [],
        },
      })),
      seatsPerTimeSlotEnabled: eventType.seatsPerTimeSlot,
    };
  }, [eventType, periodDates, metadata]);

  const formMethods = useForm<FormValues>({
    defaultValues,
    resolver: zodResolver(
      z
        .object({
          // Length if string, is converted to a number or it can be a number
          // Make it optional because it's not submitted from all tabs of the page
          eventName: z
            .string()
            .refine(
              (val) =>
                validateCustomEventName(val, t("invalid_event_name_variables"), bookingFields) === true,
              {
                message: t("invalid_event_name_variables"),
              }
            )
            .optional(),
          length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
          offsetStart: z.union([z.string().transform((val) => +val), z.number()]).optional(),
          bookingFields: eventTypeBookingFields,
          locations: z
            .array(
              z
                .object({
                  type: z.string(),
                  address: z.string().optional(),
                  link: z.string().url().optional(),
                  phone: z
                    .string()
                    .refine((val) => isValidPhoneNumber(val))
                    .optional(),
                  hostPhoneNumber: z
                    .string()
                    .refine((val) => isValidPhoneNumber(val))
                    .optional(),
                  displayLocationPublicly: z.boolean().optional(),
                  credentialId: z.number().optional(),
                  teamName: z.string().optional(),
                })
                .passthrough()
                .superRefine((val, ctx) => {
                  if (val?.link) {
                    const link = val.link;
                    const eventLocationType = getEventLocationType(val.type);
                    if (
                      eventLocationType &&
                      !eventLocationType.default &&
                      eventLocationType.linkType === "static" &&
                      eventLocationType.urlRegExp
                    ) {
                      const valid = z
                        .string()
                        .regex(new RegExp(eventLocationType.urlRegExp))
                        .safeParse(link).success;

                      if (!valid) {
                        const sampleUrl = eventLocationType.organizerInputPlaceholder;
                        ctx.addIssue({
                          code: z.ZodIssueCode.custom,
                          path: [eventLocationType?.defaultValueVariable ?? "link"],
                          message: t("invalid_url_error_message", {
                            label: eventLocationType.label,
                            sampleUrl: sampleUrl ?? "https://cal.com",
                          }),
                        });
                      }
                      return;
                    }

                    const valid = z.string().url().optional().safeParse(link).success;

                    if (!valid) {
                      ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [eventLocationType?.defaultValueVariable ?? "link"],
                        message: `Invalid URL`,
                      });
                    }
                  }
                  return;
                })
            )
            .optional(),
        })
        // TODO: Add schema for other fields later.
        .passthrough()
    ),
  });

  useEffect(() => {
    if (!formMethods.formState.isDirty) {
      //TODO: What's the best way to sync the form with backend
      formMethods.setValue("bookingFields", defaultValues.bookingFields);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  const appsMetadata = formMethods.getValues("metadata")?.apps;
  const availability = formMethods.watch("availability");
  let numberOfActiveApps = 0;

  if (appsMetadata) {
    numberOfActiveApps = Object.entries(appsMetadata).filter(
      ([appId, appData]) =>
        eventTypeApps?.items.find((app) => app.slug === appId)?.isInstalled && appData.enabled
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
        destinationCalendar={destinationCalendar}
      />
    ),
    availability: <EventAvailabilityTab eventType={eventType} isTeamEvent={!!team} />,
    team: <EventTeamTab teamMembers={teamMembers} team={team} eventType={eventType} />,
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
    webhooks: <EventWebhooksTab eventType={eventType} />,
  } as const;

  const handleSubmit = async (values: FormValues) => {
    const {
      periodDates,
      periodCountCalendarDays,
      beforeBufferTime,
      afterBufferTime,
      seatsPerTimeSlot,
      seatsShowAttendees,
      seatsShowAvailabilityCount,
      bookingLimits,
      onlyShowFirstAvailableSlot,
      durationLimits,
      recurringEvent,
      locations,
      metadata,
      customInputs,
      children,
      // We don't need to send send these values to the backend
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      seatsPerTimeSlotEnabled,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      minimumBookingNoticeInDurationType,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      bookerLayouts,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      multipleDurationEnabled,
      length,
      ...input
    } = values;

    if (!Number(length)) throw new Error(t("event_setup_length_error"));

    if (bookingLimits) {
      const isValid = validateIntervalLimitOrder(bookingLimits);
      if (!isValid) throw new Error(t("event_setup_booking_limits_error"));
    }

    if (durationLimits) {
      const isValid = validateIntervalLimitOrder(durationLimits);
      if (!isValid) throw new Error(t("event_setup_duration_limits_error"));
    }

    const layoutError = validateBookerLayouts(metadata?.bookerLayouts || null);
    if (layoutError) throw new Error(t(layoutError));

    if (metadata?.multipleDuration !== undefined) {
      if (metadata?.multipleDuration.length < 1) {
        throw new Error(t("event_setup_multiple_duration_error"));
      } else {
        if (!length && !metadata?.multipleDuration?.includes(length)) {
          throw new Error(t("event_setup_multiple_duration_default_error"));
        }
      }
    }

    if (metadata?.apps?.stripe?.paymentOption === "HOLD" && seatsPerTimeSlot) {
      throw new Error(t("seats_and_no_show_fee_error"));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { availability, ...rest } = input;
    updateMutation.mutate({
      ...rest,
      length,
      locations,
      recurringEvent,
      periodStartDate: periodDates.startDate,
      periodEndDate: periodDates.endDate,
      periodCountCalendarDays: periodCountCalendarDays === "1",
      id: eventType.id,
      beforeEventBuffer: beforeBufferTime,
      afterEventBuffer: afterBufferTime,
      bookingLimits,
      onlyShowFirstAvailableSlot,
      durationLimits,
      seatsPerTimeSlot,
      seatsShowAttendees,
      seatsShowAvailabilityCount,
      metadata,
      customInputs,
      children,
    });
  };

  const [slugExistsChildrenDialogOpen, setSlugExistsChildrenDialogOpen] = useState<ChildrenEventType[]>([]);
  const slug = formMethods.watch("slug") ?? eventType.slug;

  return (
    <>
      <EventTypeSingleLayout
        enabledAppsNumber={numberOfActiveApps}
        installedAppsNumber={eventTypeApps?.items.length || 0}
        enabledWorkflowsNumber={eventType.workflows.length}
        eventType={eventType}
        team={team}
        availability={availability}
        isUpdateMutationLoading={updateMutation.isLoading}
        formMethods={formMethods}
        // disableBorder={tabName === "apps" || tabName === "workflows" || tabName === "webhooks"}
        disableBorder={true}
        currentUserMembership={currentUserMembership}
        isUserOrganizationAdmin={props.isUserOrganizationAdmin}>
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
              seatsShowAvailabilityCount,
              bookingLimits,
              onlyShowFirstAvailableSlot,
              durationLimits,
              recurringEvent,
              locations,
              metadata,
              customInputs,
              // We don't need to send send these values to the backend
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              seatsPerTimeSlotEnabled,
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              multipleDurationEnabled,
              length,
              ...input
            } = values;

            if (!Number(length)) throw new Error(t("event_setup_length_error"));

            if (bookingLimits) {
              const isValid = validateIntervalLimitOrder(bookingLimits);
              if (!isValid) throw new Error(t("event_setup_booking_limits_error"));
            }

            if (durationLimits) {
              const isValid = validateIntervalLimitOrder(durationLimits);
              if (!isValid) throw new Error(t("event_setup_duration_limits_error"));
            }

            const layoutError = validateBookerLayouts(metadata?.bookerLayouts || null);
            if (layoutError) throw new Error(t(layoutError));

            if (metadata?.multipleDuration !== undefined) {
              if (metadata?.multipleDuration.length < 1) {
                throw new Error(t("event_setup_multiple_duration_error"));
              } else {
                if (!length && !metadata?.multipleDuration?.includes(length)) {
                  throw new Error(t("event_setup_multiple_duration_default_error"));
                }
              }
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { availability, ...rest } = input;
            updateMutation.mutate({
              ...rest,
              length,
              locations,
              recurringEvent,
              periodStartDate: periodDates.startDate,
              periodEndDate: periodDates.endDate,
              periodCountCalendarDays: periodCountCalendarDays === "1",
              id: eventType.id,
              beforeEventBuffer: beforeBufferTime,
              afterEventBuffer: afterBufferTime,
              bookingLimits,
              onlyShowFirstAvailableSlot,
              durationLimits,
              seatsPerTimeSlot,
              seatsShowAttendees,
              seatsShowAvailabilityCount,
              metadata,
              customInputs,
            });
          }}>
          <div ref={animationParentRef}>{tabMap[tabName]}</div>
        </Form>
      </EventTypeSingleLayout>

      {slugExistsChildrenDialogOpen.length ? (
        <ManagedEventTypeDialog
          slugExistsChildrenDialogOpen={slugExistsChildrenDialogOpen}
          isLoading={formMethods.formState.isSubmitting}
          onOpenChange={() => {
            setSlugExistsChildrenDialogOpen([]);
          }}
          slug={slug}
          onConfirm={(e: { preventDefault: () => void }) => {
            e.preventDefault();
            handleSubmit(formMethods.getValues());
            telemetry.event(telemetryEventTypes.slugReplacementAction);
            setSlugExistsChildrenDialogOpen([]);
          }}
        />
      ) : null}
    </>
  );
};

const EventTypePageWrapper = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { data } = trpc.viewer.eventTypes.get.useQuery({ id: props.type });

  if (!data) return null;
  return <EventTypePage {...(data as EventTypeSetupProps)} />;
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, res, query } = context;

  const session = await getServerSession({ req, res });

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

  await ssr.viewer.eventTypes.get.prefetch({ id: typeParam });
  return {
    props: {
      type: typeParam,
      trpcState: ssr.dehydrate(),
    },
  };
};

EventTypePageWrapper.PageWrapper = PageWrapper;

export default EventTypePageWrapper;
