import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import BookingPageTagManager from "@calcom/app-store/BookingPageTagManager";
import { EventLocationType, getEventLocationType, locationKeyToString } from "@calcom/app-store/locations";
import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import { LocationObject, LocationType } from "@calcom/core/location";
import dayjs from "@calcom/dayjs";
import {
  useEmbedNonStylesConfig,
  useEmbedUiConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import getBookingResponsesSchema, {
  getBookingResponsesPartialSchema,
} from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { FormBuilderField } from "@calcom/features/form-builder/FormBuilder";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import { APP_NAME } from "@calcom/lib/constants";
import { getBookingFieldsWithSystemFields } from "@calcom/lib/getEventTypeById";
import getStripeAppData from "@calcom/lib/getStripeAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { HttpError } from "@calcom/lib/http-error";
import { getEveryFreqFor } from "@calcom/lib/recurringStrings";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { Button, Form, Tooltip } from "@calcom/ui";
import { FiCalendar, FiCreditCard, FiRefreshCw, FiUser, FiAlertTriangle } from "@calcom/ui/components/icon";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import useRouterQuery from "@lib/hooks/useRouterQuery";
import createBooking from "@lib/mutations/bookings/create-booking";
import createRecurringBooking from "@lib/mutations/bookings/create-recurring-booking";
import { parseDate, parseRecurringDates } from "@lib/parseDate";

import Gates, { Gate, GateState } from "@components/Gates";
import BookingDescription from "@components/booking/BookingDescription";

import { BookPageProps } from "../../../pages/[user]/book";
import { HashLinkPageProps } from "../../../pages/d/[link]/book";
import { TeamBookingPageProps } from "../../../pages/team/[slug]/book";

type BookingPageProps = BookPageProps | TeamBookingPageProps | HashLinkPageProps;
const BookingFields = ({
  fields,
  locations,
  selectedLocation,
  rescheduleUid,
}: {
  fields: BookingPageProps["eventType"]["bookingFields"];
  locations: LocationObject[];
  rescheduleUid?: string;
  selectedLocation: ReturnType<typeof getEventLocationType>;
}) => {
  const { t } = useLocale();
  return (
    <>
      {fields.map((field, index) => {
        // TODO: ManageBookings: Shouldn't we render hidden fields but invisible so that they can be prefilled?
        if (field.hidden) return null;
        let readOnly =
          (field.editable === "system" || field.editable === "system-but-optional") && !!rescheduleUid;
        //TODO: `rescheduleReason` should be an enum or similar to avoid typos
        if (field.name === "rescheduleReason") {
          if (!rescheduleUid) {
            return null;
          }
          // rescheduleReason is a reschedule specific field and thus should be editable during reschedule
          readOnly = false;
        }

        if (field.name === "location" && field.type == "radioInput") {
          const options = locations.map((location) => {
            const locationString = locationKeyToString(location);
            if (typeof locationString !== "string") {
              // It's possible that location app got uninstalled
              return null;
            }
            return {
              label: t(locationString),
              value: location.type,
            };
          });

          field.options = options.filter(
            (location): location is NonNullable<typeof options[number]> => !!location
          );

          if (!field.optionsInputs) {
            throw new Error("radioInput must have optionsInputs");
          }
          field.optionsInputs.attendeeInPerson.placeholder = t(
            selectedLocation?.attendeeInputPlaceholder || ""
          );
        }

        field.label = t(field.label);

        return <FormBuilderField field={field} readOnly={readOnly} key={index} />;
      })}
    </>
  );
};

const BookingPage = ({
  eventType,
  booking,
  profile,
  isDynamicGroupBooking,
  recurringEventCount,
  hasHashedBookingLink,
  hashedLink,
  ...restProps
}: BookingPageProps) => {
  const { t, i18n } = useLocale();
  const { duration: queryDuration } = useRouterQuery("duration");
  const isEmbed = useIsEmbed(restProps.isEmbed);
  const embedUiConfig = useEmbedUiConfig();
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const router = useRouter();
  const { data: session } = useSession();
  const isBackgroundTransparent = useIsBackgroundTransparent();
  const telemetry = useTelemetry();
  const [gateState, gateDispatcher] = useReducer(
    (state: GateState, newState: Partial<GateState>) => ({
      ...state,
      ...newState,
    }),
    {}
  );
  const stripeAppData = getStripeAppData(eventType);
  // Define duration now that we support multiple duration eventTypes
  let duration = eventType.length;
  if (
    queryDuration &&
    !isNaN(Number(queryDuration)) &&
    eventType.metadata?.multipleDuration &&
    eventType.metadata?.multipleDuration.includes(Number(queryDuration))
  ) {
    duration = Number(queryDuration);
  }

  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(
        telemetryEventTypes.embedView,
        collectPageParameters("/book", { isTeamBooking: document.URL.includes("team/") })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutation = useMutation(createBooking, {
    onSuccess: async (responseData) => {
      const { uid, paymentUid } = responseData;
      if (paymentUid) {
        return await router.push(
          createPaymentLink({
            paymentUid,
            date,
            name: bookingForm.getValues("responses.name"),
            email: bookingForm.getValues("responses.email"),
            absolute: false,
          })
        );
      }

      return router.push({
        pathname: `/booking/${uid}`,
        query: {
          isSuccessBookingPage: true,
          email: bookingForm.getValues("responses.email"),
          eventTypeSlug: eventType.slug,
          formerTime: booking?.startTime.toString(),
        },
      });
    },
  });

  const recurringMutation = useMutation(createRecurringBooking, {
    onSuccess: async (responseData = []) => {
      const { uid } = responseData[0] || {};

      return router.push({
        pathname: `/booking/${uid}`,
        query: {
          allRemainingBookings: true,
          email: bookingForm.getValues("responses.email"),
          eventTypeSlug: eventType.slug,
          formerTime: booking?.startTime.toString(),
        },
      });
    },
  });

  const rescheduleUid = router.query.rescheduleUid as string;
  useTheme(profile.theme);
  const date = asStringOrNull(router.query.date);
  const querySchema = getBookingResponsesPartialSchema({
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  });
  // string value for - text, textarea, select, radio,
  // string value with , for checkbox and multiselect
  // Object {value:"", optionValue:""} for radioInput
  const parsedQuery = querySchema.parse({
    ...router.query,
    guests: router.query.guest,
  });

  // it would be nice if Prisma at some point in the future allowed for Json<Location>; as of now this is not the case.
  const locations: LocationObject[] = useMemo(
    () => (eventType.locations as LocationObject[]) || [],
    [eventType.locations]
  );

  const [isClientTimezoneAvailable, setIsClientTimezoneAvailable] = useState(false);
  useEffect(() => {
    // THis is to fix hydration error that comes because of different timezone on server and client
    setIsClientTimezoneAvailable(true);
  }, []);

  const loggedInIsOwner = eventType?.users[0]?.id === session?.user?.id;

  const getFormBuilderFieldValueFromQuery = (paramName: string) => {
    return parsedQuery[paramName];
  };

  // There should only exists one default userData variable for primaryAttendee.
  const defaultUserValues = {
    email: rescheduleUid ? booking?.attendees[0].email : getFormBuilderFieldValueFromQuery("email"),
    name: rescheduleUid ? booking?.attendees[0].name : getFormBuilderFieldValueFromQuery("name"),
  };

  const defaultValues = () => {
    if (!rescheduleUid) {
      const defaults = {
        responses: {} as z.infer<typeof bookingFormSchema>["responses"],
      };

      const responses = eventType.bookingFields.reduce((responses, field) => {
        return {
          ...responses,
          [field.name]: getFormBuilderFieldValueFromQuery(field.name),
        };
      }, {});
      defaults.responses = {
        ...responses,
        name: defaultUserValues.name || (!loggedInIsOwner && session?.user?.name) || "",
        email: defaultUserValues.email || (!loggedInIsOwner && session?.user?.email) || "",
      };

      return defaults;
    }

    if (!booking || !booking.attendees.length) {
      return {};
    }
    const primaryAttendee = booking.attendees[0];
    if (!primaryAttendee) {
      return {};
    }

    const defaults = {
      responses: {} as z.infer<typeof bookingFormSchema>["responses"],
    };

    const responses = eventType.bookingFields.reduce((responses, field) => {
      return {
        ...responses,
        [field.name]: booking.responses[field.name],
      };
    }, {});
    defaults.responses = {
      ...responses,
      name: defaultUserValues.name || (!loggedInIsOwner && session?.user?.name) || "",
      email: defaultUserValues.email || (!loggedInIsOwner && session?.user?.email) || "",
    };
    console.log(defaults);
    return defaults;
  };

  const bookingFormSchema = z
    .object({
      responses: getBookingResponsesSchema({
        bookingFields: getBookingFieldsWithSystemFields(eventType),
      }),
    })
    .passthrough();

  type BookingFormValues = {
    locationType?: EventLocationType["type"];
    responses: z.infer<typeof bookingFormSchema>["responses"];
  };

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: defaultValues(),
    resolver: zodResolver(bookingFormSchema), // Since this isn't set to strict we only validate the fields in the schema
  });
  useEffect(() => {
    // window.bookingForm = bookingForm;
  });
  const selectedLocationType = useWatch({
    control: bookingForm.control,
    name: "locationType",
    defaultValue: ((): EventLocationType["type"] | undefined => {
      if (router.query.location) {
        return router.query.location as EventLocationType["type"];
      }
      if (locations.length === 1) {
        return locations[0]?.type;
      }
    })(),
  });

  const selectedLocation = getEventLocationType(selectedLocationType);

  // Calculate the booking date(s)
  let recurringStrings: string[] = [],
    recurringDates: Date[] = [];
  if (eventType.recurringEvent?.freq && recurringEventCount !== null) {
    [recurringStrings, recurringDates] = parseRecurringDates(
      {
        startDate: date,
        timeZone: timeZone(),
        recurringEvent: eventType.recurringEvent,
        recurringCount: parseInt(recurringEventCount.toString()),
      },
      i18n
    );
  }

  const bookEvent = (booking: BookingFormValues) => {
    telemetry.event(
      top !== window ? telemetryEventTypes.embedBookingConfirmed : telemetryEventTypes.bookingConfirmed,
      { isTeamBooking: document.URL.includes("team/") }
    );
    // "metadata" is a reserved key to allow for connecting external users without relying on the email address.
    // <...url>&metadata[user_id]=123 will be send as a custom input field as the hidden type.

    // @TODO: move to metadata
    const metadata = Object.keys(router.query)
      .filter((key) => key.startsWith("metadata"))
      .reduce(
        (metadata, key) => ({
          ...metadata,
          [key.substring("metadata[".length, key.length - 1)]: router.query[key],
        }),
        {}
      );

    if (recurringDates.length) {
      // Identify set of bookings to one intance of recurring event to support batch changes
      const recurringEventId = uuidv4();
      const recurringBookings = recurringDates.map((recurringDate) => ({
        ...booking,
        start: dayjs(recurringDate).format(),
        end: dayjs(recurringDate).add(duration, "minute").format(),
        eventTypeId: eventType.id,
        eventTypeSlug: eventType.slug,
        recurringEventId,
        // Added to track down the number of actual occurrences selected by the user
        recurringCount: recurringDates.length,
        timeZone: timeZone(),
        language: i18n.language,
        rescheduleUid,
        user: router.query.user,
        metadata,
        hasHashedBookingLink,
        hashedLink,
        ethSignature: gateState.rainbowToken,
      }));
      recurringMutation.mutate(recurringBookings);
    } else {
      mutation.mutate({
        ...booking,
        start: dayjs(date).format(),
        end: dayjs(date).add(duration, "minute").format(),
        eventTypeId: eventType.id,
        eventTypeSlug: eventType.slug,
        timeZone: timeZone(),
        language: i18n.language,
        rescheduleUid,
        bookingUid: router.query.bookingUid as string,
        user: router.query.user,
        metadata,
        hasHashedBookingLink,
        hashedLink,
        ethSignature: gateState.rainbowToken,
      });
    }
  };

  const showEventTypeDetails = (isEmbed && !embedUiConfig.hideEventTypeDetails) || !isEmbed;
  const rainbowAppData = getEventTypeAppData(eventType, "rainbow") || {};

  // Define conditional gates here
  const gates = [
    // Rainbow gate is only added if the event has both a `blockchainId` and a `smartContractAddress`
    rainbowAppData && rainbowAppData.blockchainId && rainbowAppData.smartContractAddress
      ? ("rainbow" as Gate)
      : undefined,
  ];

  return (
    <Gates gates={gates} appData={rainbowAppData} dispatch={gateDispatcher}>
      <Head>
        <title>
          {rescheduleUid
            ? t("booking_reschedule_confirmation", {
                eventTypeTitle: eventType.title,
                profileName: profile.name,
              })
            : t("booking_confirmation", {
                eventTypeTitle: eventType.title,
                profileName: profile.name,
              })}{" "}
          | {APP_NAME}
        </title>
        <link rel="icon" href="/favico.ico" />
      </Head>
      <BookingPageTagManager eventType={eventType} />
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />
      <main
        className={classNames(
          shouldAlignCentrally ? "mx-auto" : "",
          isEmbed ? "" : "sm:my-24",
          "my-0 max-w-3xl"
        )}>
        <div
          className={classNames(
            "main overflow-hidden",
            isBackgroundTransparent ? "" : "dark:bg-darkgray-100 bg-white dark:border",
            "dark:border-darkgray-300 rounded-md sm:border"
          )}>
          <div className="sm:flex">
            {showEventTypeDetails && (
              <div className="sm:dark:border-darkgray-300 dark:text-darkgray-600 flex flex-col px-6 pt-6 pb-0 text-gray-600 sm:w-1/2 sm:border-r sm:pb-6">
                <BookingDescription isBookingPage profile={profile} eventType={eventType}>
                  {stripeAppData.price > 0 && (
                    <p className="text-bookinglight -ml-2 px-2 text-sm ">
                      <FiCreditCard className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                      <IntlProvider locale="en">
                        <FormattedNumber
                          value={stripeAppData.price / 100.0}
                          style="currency"
                          currency={stripeAppData.currency.toUpperCase()}
                        />
                      </IntlProvider>
                    </p>
                  )}
                  {!rescheduleUid && eventType.recurringEvent?.freq && recurringEventCount && (
                    <div className="items-start text-sm font-medium text-gray-600 dark:text-white">
                      <FiRefreshCw className="ml-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                      <p className="-ml-2 inline-block items-center px-2">
                        {getEveryFreqFor({
                          t,
                          recurringEvent: eventType.recurringEvent,
                          recurringCount: recurringEventCount,
                        })}
                      </p>
                    </div>
                  )}
                  <div className="text-bookinghighlight flex items-start text-sm">
                    <FiCalendar className="ml-[2px] mt-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                    <div className="text-sm font-medium">
                      {isClientTimezoneAvailable &&
                        (rescheduleUid || !eventType.recurringEvent?.freq) &&
                        `${parseDate(date, i18n)}`}
                      {isClientTimezoneAvailable &&
                        !rescheduleUid &&
                        eventType.recurringEvent?.freq &&
                        recurringStrings.slice(0, 5).map((timeFormatted, key) => {
                          return <p key={key}>{timeFormatted}</p>;
                        })}
                      {!rescheduleUid && eventType.recurringEvent?.freq && recurringStrings.length > 5 && (
                        <div className="flex">
                          <Tooltip
                            content={recurringStrings.slice(5).map((timeFormatted, key) => (
                              <p key={key}>{timeFormatted}</p>
                            ))}>
                            <p className="dark:text-darkgray-600 text-sm">
                              + {t("plus_more", { count: recurringStrings.length - 5 })}
                            </p>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                  {booking?.startTime && rescheduleUid && (
                    <div>
                      <p className="mt-8 mb-2 text-sm " data-testid="former_time_p">
                        {t("former_time")}
                      </p>
                      <p className="line-through ">
                        <FiCalendar className="ml-[2px] -mt-1 inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px]" />
                        {isClientTimezoneAvailable &&
                          typeof booking.startTime === "string" &&
                          parseDate(dayjs(booking.startTime), i18n)}
                      </p>
                    </div>
                  )}
                  {!!eventType.seatsPerTimeSlot && (
                    <div className="text-bookinghighlight flex items-start text-sm">
                      <FiUser
                        className={`ml-[2px] mt-[2px] inline-block h-4 w-4 ltr:mr-[10px] rtl:ml-[10px] ${
                          booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.5
                            ? "text-rose-600"
                            : booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.33
                            ? "text-yellow-500"
                            : "text-bookinghighlight"
                        }`}
                      />
                      <p
                        className={`${
                          booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.5
                            ? "text-rose-600"
                            : booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.33
                            ? "text-yellow-500"
                            : "text-bookinghighlight"
                        } mb-2 font-medium`}>
                        {booking
                          ? eventType.seatsPerTimeSlot - booking.attendees.length
                          : eventType.seatsPerTimeSlot}{" "}
                        / {eventType.seatsPerTimeSlot} {t("seats_available")}
                      </p>
                    </div>
                  )}
                </BookingDescription>
              </div>
            )}
            <div className={classNames("p-6", showEventTypeDetails ? "sm:w-1/2" : "w-full")}>
              <Form form={bookingForm} handleSubmit={bookEvent}>
                <BookingFields
                  fields={eventType.bookingFields}
                  locations={locations}
                  selectedLocation={selectedLocation}
                  rescheduleUid={rescheduleUid}
                />

                <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                  <Button color="minimal" type="button" onClick={() => router.back()}>
                    {t("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    data-testid={rescheduleUid ? "confirm-reschedule-button" : "confirm-book-button"}
                    loading={mutation.isLoading || recurringMutation.isLoading}>
                    {rescheduleUid ? t("reschedule") : t("confirm")}
                  </Button>
                </div>
              </Form>
              {(mutation.isError || recurringMutation.isError) && (
                <ErrorMessage error={mutation.error || recurringMutation.error} />
              )}
            </div>
          </div>
        </div>
      </main>
    </Gates>
  );
};

export default BookingPage;

function ErrorMessage({ error }: { error: unknown }) {
  const { t } = useLocale();
  const { query: { rescheduleUid } = {} } = useRouter();

  return (
    <div data-testid="booking-fail" className="mt-2 border-l-4 border-yellow-400 bg-yellow-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <FiAlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ltr:ml-3 rtl:mr-3">
          <p className="text-sm text-yellow-700">
            {rescheduleUid ? t("reschedule_fail") : t("booking_fail")}{" "}
            {error instanceof HttpError || error instanceof Error ? t(error.message) : "Unknown error"}
          </p>
        </div>
      </div>
    </div>
  );
}
