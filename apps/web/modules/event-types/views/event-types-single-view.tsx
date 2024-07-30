"use client";

/* eslint-disable @typescript-eslint/no-empty-function */
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { TFunction } from "next-i18next";
import dynamic from "next/dynamic";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import checkForMultiplePaymentApps from "@calcom/app-store/_utils/payments/checkForMultiplePaymentApps";
import { getEventLocationType } from "@calcom/app-store/locations";
import { validateCustomEventName } from "@calcom/core/event";
import {
  DEFAULT_PROMPT_VALUE,
  DEFAULT_BEGIN_MESSAGE,
} from "@calcom/features/ee/cal-ai-phone/promptTemplates";
import type { Workflow } from "@calcom/features/ee/workflows/lib/types";
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { validateIntervalLimitOrder } from "@calcom/lib";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { HttpError } from "@calcom/lib/http-error";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Form, showToast } from "@calcom/ui";

import type { AppProps } from "@lib/app-providers";
import { checkForEmptyAssignment } from "@lib/checkForEmptyAssignment";

import { EventTypeSingleLayout } from "@components/eventtype/EventTypeSingleLayout";

import { type PageProps } from "~/event-types/views/event-types-single-view.getServerSideProps";

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

const EventInstantTab = dynamic(() =>
  import("@components/eventtype/EventInstantTab").then((mod) => mod.EventInstantTab)
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

const EventAITab = dynamic(() => import("@components/eventtype/EventAITab").then((mod) => mod.EventAITab));

const ManagedEventTypeDialog = dynamic(() => import("@components/eventtype/ManagedEventDialog"));

const AssignmentWarningDialog = dynamic(() => import("@components/eventtype/AssignmentWarningDialog"));

export type Host = { isFixed: boolean; userId: number; priority: number };

export type CustomInputParsed = typeof customInputSchema._output;

const querySchema = z.object({
  tabName: z
    .enum([
      "setup",
      "availability",
      "apps",
      "limits",
      "instant",
      "recurring",
      "team",
      "advanced",
      "workflows",
      "webhooks",
      "ai",
    ])
    .optional()
    .default("setup"),
});

export type EventTypeSetupProps = RouterOutputs["viewer"]["eventTypes"]["get"];
export type EventTypeSetup = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"];
export type EventTypeAssignedUsers = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["children"];
export type EventTypeHosts = RouterOutputs["viewer"]["eventTypes"]["get"]["eventType"]["hosts"];

export const locationsResolver = (t: TFunction) => {
  return z
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
              const valid = z.string().regex(new RegExp(eventLocationType.urlRegExp)).safeParse(link).success;

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
    .optional();
};

const EventTypePage = (props: EventTypeSetupProps & { allActiveWorkflows?: Workflow[] }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
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
  const [isOpenAssignmentWarnDialog, setIsOpenAssignmentWarnDialog] = useState<boolean>(false);
  const [pendingRoute, setPendingRoute] = useState("");
  const leaveWithoutAssigningHosts = useRef(false);
  const isTeamEventTypeDeleted = useRef(false);
  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();
  const updateMutation = trpc.viewer.eventTypes.update.useMutation({
    onSuccess: async () => {
      const currentValues = formMethods.getValues();

      currentValues.children = currentValues.children.map((child) => ({
        ...child,
        created: true,
      }));
      currentValues.assignAllTeamMembers = currentValues.assignAllTeamMembers || false;

      // Reset the form with these values as new default values to ensure the correct comparison for dirtyFields eval
      formMethods.reset(currentValues);

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

  const router = useRouter();

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
      id: eventType.id,
      slug: eventType.slug,
      afterEventBuffer: eventType.afterEventBuffer,
      beforeEventBuffer: eventType.beforeEventBuffer,
      eventName: eventType.eventName || "",
      scheduleName: eventType.scheduleName,
      periodDays: eventType.periodDays,
      requiresBookerEmailVerification: eventType.requiresBookerEmailVerification,
      seatsPerTimeSlot: eventType.seatsPerTimeSlot,
      seatsShowAttendees: eventType.seatsShowAttendees,
      seatsShowAvailabilityCount: eventType.seatsShowAvailabilityCount,
      lockTimeZoneToggleOnBookingPage: eventType.lockTimeZoneToggleOnBookingPage,
      locations: eventType.locations || [],
      destinationCalendar: eventType.destinationCalendar,
      recurringEvent: eventType.recurringEvent || null,
      isInstantEvent: eventType.isInstantEvent,
      instantMeetingExpiryTimeOffsetInSeconds: eventType.instantMeetingExpiryTimeOffsetInSeconds,
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
      hideCalendarNotes: eventType.hideCalendarNotes,
      offsetStart: eventType.offsetStart,
      bookingFields: eventType.bookingFields,
      periodType: eventType.periodType,
      periodCountCalendarDays: eventType.periodCountCalendarDays ? true : false,
      schedulingType: eventType.schedulingType,
      requiresConfirmation: eventType.requiresConfirmation,
      slotInterval: eventType.slotInterval,
      minimumBookingNotice: eventType.minimumBookingNotice,
      metadata,
      hosts: eventType.hosts,
      successRedirectUrl: eventType.successRedirectUrl || "",
      forwardParamsSuccessRedirect: eventType.forwardParamsSuccessRedirect,
      users: eventType.users,
      useEventTypeDestinationCalendarEmail: eventType.useEventTypeDestinationCalendarEmail,
      secondaryEmailId: eventType?.secondaryEmailId || -1,
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
      assignAllTeamMembers: eventType.assignAllTeamMembers,
      aiPhoneCallConfig: {
        generalPrompt: eventType.aiPhoneCallConfig?.generalPrompt ?? DEFAULT_PROMPT_VALUE,
        enabled: eventType.aiPhoneCallConfig?.enabled,
        beginMessage: eventType.aiPhoneCallConfig?.beginMessage ?? DEFAULT_BEGIN_MESSAGE,
        guestName: eventType.aiPhoneCallConfig?.guestName,
        guestEmail: eventType.aiPhoneCallConfig?.guestEmail,
        guestCompany: eventType.aiPhoneCallConfig?.guestCompany,
        yourPhoneNumber: eventType.aiPhoneCallConfig?.yourPhoneNumber,
        numberToCall: eventType.aiPhoneCallConfig?.numberToCall,
        templateType: eventType.aiPhoneCallConfig?.templateType ?? "CUSTOM_TEMPLATE",
        schedulerName: eventType.aiPhoneCallConfig?.schedulerName,
      },
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
            .superRefine((val, ctx) => {
              const validationResult = validateCustomEventName(val, bookingFields);
              if (validationResult !== true) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: t("invalid_event_name_variables", { item: validationResult }),
                });
              }
            })
            .optional(),
          length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
          offsetStart: z.union([z.string().transform((val) => +val), z.number()]).optional(),
          bookingFields: eventTypeBookingFields,
          locations: locationsResolver(t),
        })
        // TODO: Add schema for other fields later.
        .passthrough()
    ),
  });
  const {
    formState: { isDirty: isFormDirty, dirtyFields },
  } = formMethods;

  const onDelete = () => {
    isTeamEventTypeDeleted.current = true;
  };

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const paths = url.split("/");

      // If the event-type is deleted, we can't show the empty assignment warning
      if (isTeamEventTypeDeleted.current) return;

      if (
        !!team &&
        !leaveWithoutAssigningHosts.current &&
        (url === "/event-types" || paths[1] !== "event-types") &&
        checkForEmptyAssignment({
          assignedUsers: eventType.children,
          hosts: eventType.hosts,
          assignAllTeamMembers: eventType.assignAllTeamMembers,
          isManagedEventType: eventType.schedulingType === SchedulingType.MANAGED,
        })
      ) {
        setIsOpenAssignmentWarnDialog(true);
        setPendingRoute(url);
        router.events.emit(
          "routeChangeError",
          new Error(`Aborted route change to ${url} because none was assigned to team event`)
        );
        throw "Aborted";
      }
    };
    router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router, eventType.hosts, eventType.children, eventType.assignAllTeamMembers]);

  const appsMetadata = formMethods.getValues("metadata")?.apps;
  const availability = formMethods.watch("availability");
  let numberOfActiveApps = 0;

  if (appsMetadata) {
    numberOfActiveApps = Object.entries(appsMetadata).filter(
      ([appId, appData]) =>
        eventTypeApps?.items.find((app) => app.slug === appId)?.isInstalled && appData.enabled
    ).length;
  }

  const permalink = `${WEBSITE_URL}/${team ? `team/${team.slug}` : eventType.users[0].username}/${
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
    instant: <EventInstantTab eventType={eventType} isTeamEvent={!!team} />,
    recurring: <EventRecurringTab eventType={eventType} />,
    apps: <EventAppsTab eventType={{ ...eventType, URL: permalink }} />,
    workflows: props.allActiveWorkflows ? (
      <EventWorkflowsTab eventType={eventType} workflows={props.allActiveWorkflows} />
    ) : (
      <></>
    ),
    webhooks: <EventWebhooksTab eventType={eventType} />,
    ai: <EventAITab eventType={eventType} isTeamEvent={!!team} />,
  } as const;
  const isObject = <T,>(value: T): boolean => {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  };

  const isArray = <T,>(value: T): boolean => {
    return Array.isArray(value);
  };

  const isFieldDirty = (fieldName: keyof FormValues) => {
    // If the field itself is directly marked as dirty
    if (dirtyFields[fieldName] === true) {
      return true;
    }

    // Check if the field is an object or an array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldValue: any = getNestedField(dirtyFields, fieldName);
    if (isObject(fieldValue)) {
      for (const key in fieldValue) {
        if (fieldValue[key] === true) {
          return true;
        }

        if (isObject(fieldValue[key]) || isArray(fieldValue[key])) {
          const nestedFieldName = `${fieldName}.${key}` as keyof FormValues;
          // Recursive call for nested objects or arrays
          if (isFieldDirty(nestedFieldName)) {
            return true;
          }
        }
      }
    }
    if (isArray(fieldValue)) {
      for (const element of fieldValue) {
        // If element is an object, check each property of the object
        if (isObject(element)) {
          for (const key in element) {
            if (element[key] === true) {
              return true;
            }

            if (isObject(element[key]) || isArray(element[key])) {
              const nestedFieldName = `${fieldName}.${key}` as keyof FormValues;
              // Recursive call for nested objects or arrays within each element
              if (isFieldDirty(nestedFieldName)) {
                return true;
              }
            }
          }
        } else if (element === true) {
          return true;
        }
      }
    }

    return false;
  };

  const getNestedField = (obj: typeof dirtyFields, path: string) => {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length; i++) {
      // @ts-expect-error /—— currentKey could be any deeply nested fields thanks to recursion
      const currentKey = current[keys[i]];
      if (currentKey === undefined) return undefined;
      current = currentKey;
    }

    return current;
  };

  const getDirtyFields = (values: FormValues): Partial<FormValues> => {
    if (!isFormDirty) {
      return {};
    }
    const updatedFields: Partial<FormValues> = {};
    Object.keys(dirtyFields).forEach((key) => {
      const typedKey = key as keyof typeof dirtyFields;
      updatedFields[typedKey] = undefined;
      const isDirty = isFieldDirty(typedKey);
      if (isDirty) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        updatedFields[typedKey] = values[typedKey];
      }
    });
    return updatedFields;
  };

  const handleSubmit = async (values: FormValues) => {
    const { children } = values;
    const dirtyValues = getDirtyFields(values);
    const dirtyFieldExists = Object.keys(dirtyValues).length !== 0;
    const {
      periodDates,
      periodCountCalendarDays,
      beforeEventBuffer,
      afterEventBuffer,
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
      assignAllTeamMembers,
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
    } = dirtyValues;
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
        // if length is unchanged, we skip this check
        if (length !== undefined) {
          if (!length && !metadata?.multipleDuration?.includes(length)) {
            //This would work but it leaves the potential of this check being useless. Need to check against length and not eventType.length, but length can be undefined
            throw new Error(t("event_setup_multiple_duration_default_error"));
          }
        }
      }
    }

    // Prevent two payment apps to be enabled
    // Ok to cast type here because this metadata will be updated as the event type metadata
    if (checkForMultiplePaymentApps(metadata as z.infer<typeof EventTypeMetaDataSchema>))
      throw new Error(t("event_setup_multiple_payment_apps_error"));

    if (metadata?.apps?.stripe?.paymentOption === "HOLD" && seatsPerTimeSlot) {
      throw new Error(t("seats_and_no_show_fee_error"));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { availability, users, scheduleName, ...rest } = input;
    const payload = {
      ...rest,
      length,
      locations,
      recurringEvent,
      periodStartDate: periodDates?.startDate,
      periodEndDate: periodDates?.endDate,
      periodCountCalendarDays,
      id: eventType.id,
      beforeEventBuffer,
      afterEventBuffer,
      bookingLimits,
      onlyShowFirstAvailableSlot,
      durationLimits,
      seatsPerTimeSlot,
      seatsShowAttendees,
      seatsShowAvailabilityCount,
      metadata,
      customInputs,
      children,
      assignAllTeamMembers,
    };
    // Filter out undefined values
    const filteredPayload = Object.entries(payload).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // @ts-expect-error Element implicitly has any type
        acc[key] = value;
      }
      return acc;
    }, {});

    if (dirtyFieldExists) {
      updateMutation.mutate({ ...filteredPayload, id: eventType.id });
    }
  };

  const [slugExistsChildrenDialogOpen, setSlugExistsChildrenDialogOpen] = useState<ChildrenEventType[]>([]);
  const slug = formMethods.watch("slug") ?? eventType.slug;

  // Optional prerender all tabs after 300 ms on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      const Components = [
        EventSetupTab,
        EventAvailabilityTab,
        EventTeamTab,
        EventLimitsTab,
        EventAdvancedTab,
        EventInstantTab,
        EventRecurringTab,
        EventAppsTab,
        EventWorkflowsTab,
        EventWebhooksTab,
      ];

      Components.forEach((C) => {
        // @ts-expect-error Property 'render' does not exist on type 'ComponentClass
        C.render.preload();
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, []);
  return (
    <>
      <EventTypeSingleLayout
        enabledAppsNumber={numberOfActiveApps}
        installedAppsNumber={eventTypeApps?.items.length || 0}
        enabledWorkflowsNumber={props.allActiveWorkflows ? props.allActiveWorkflows.length : 0}
        eventType={eventType}
        activeWebhooksNumber={eventType.webhooks.filter((webhook) => webhook.active).length}
        team={team}
        availability={availability}
        isUpdateMutationLoading={updateMutation.isPending}
        formMethods={formMethods}
        // disableBorder={tabName === "apps" || tabName === "workflows" || tabName === "webhooks"}
        disableBorder={true}
        currentUserMembership={currentUserMembership}
        bookerUrl={eventType.bookerUrl}
        isUserOrganizationAdmin={props.isUserOrganizationAdmin}
        onDelete={onDelete}>
        <Form
          form={formMethods}
          id="event-type-form"
          handleSubmit={async (values) => {
            const { children } = values;
            const dirtyValues = getDirtyFields(values);
            const dirtyFieldExists = Object.keys(dirtyValues).length !== 0;
            const {
              periodDates,
              periodCountCalendarDays,
              beforeEventBuffer,
              afterEventBuffer,
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
            } = dirtyValues;

            if (length && !Number(length)) throw new Error(t("event_setup_length_error"));

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
                if (length !== undefined) {
                  if (!length && !metadata?.multipleDuration?.includes(length)) {
                    //This would work but it leaves the potential of this check being useless. Need to check against length and not eventType.length, but length can be undefined
                    throw new Error(t("event_setup_multiple_duration_default_error"));
                  }
                }
              }
            }

            // Prevent two payment apps to be enabled
            // Ok to cast type here because this metadata will be updated as the event type metadata
            if (checkForMultiplePaymentApps(metadata as z.infer<typeof EventTypeMetaDataSchema>))
              throw new Error(t("event_setup_multiple_payment_apps_error"));

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { availability, users, scheduleName, ...rest } = input;
            const payload = {
              ...rest,
              children,
              length,
              locations,
              recurringEvent,
              periodStartDate: periodDates?.startDate,
              periodEndDate: periodDates?.endDate,
              periodCountCalendarDays,
              id: eventType.id,
              beforeEventBuffer,
              afterEventBuffer,
              bookingLimits,
              onlyShowFirstAvailableSlot,
              durationLimits,
              seatsPerTimeSlot,
              seatsShowAttendees,
              seatsShowAvailabilityCount,
              metadata,
              customInputs,
            };
            // Filter out undefined values
            const filteredPayload = Object.entries(payload).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                // @ts-expect-error Element implicitly has any type
                acc[key] = value;
              }
              return acc;
            }, {});

            if (dirtyFieldExists) {
              updateMutation.mutate({ ...filteredPayload, id: eventType.id, hashedLink: values.hashedLink });
            }
          }}>
          <div ref={animationParentRef}>{tabMap[tabName]}</div>
        </Form>
      </EventTypeSingleLayout>
      {slugExistsChildrenDialogOpen.length ? (
        <ManagedEventTypeDialog
          slugExistsChildrenDialogOpen={slugExistsChildrenDialogOpen}
          isPending={formMethods.formState.isSubmitting}
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
      <AssignmentWarningDialog
        isOpenAssignmentWarnDialog={isOpenAssignmentWarnDialog}
        setIsOpenAssignmentWarnDialog={setIsOpenAssignmentWarnDialog}
        pendingRoute={pendingRoute}
        leaveWithoutAssigningHosts={leaveWithoutAssigningHosts}
        id={eventType.id}
      />
    </>
  );
};
const EventTypePageWrapper: React.FC<PageProps> & {
  PageWrapper?: AppProps["Component"]["PageWrapper"];
  getLayout?: AppProps["Component"]["getLayout"];
} = (props) => {
  const { data } = trpc.viewer.eventTypes.get.useQuery({ id: props.type });

  if (!data) return null;

  const eventType = data.eventType;

  const { data: workflows } = trpc.viewer.workflows.getAllActiveWorkflows.useQuery({
    eventType: {
      id: props.type,
      teamId: eventType.teamId,
      userId: eventType.userId,
      parent: eventType.parent,
      metadata: eventType.metadata,
    },
  });

  const propsData = {
    ...(data as EventTypeSetupProps),
    allActiveWorkflows: workflows,
  };

  return <EventTypePage {...propsData} />;
};

export default EventTypePageWrapper;
