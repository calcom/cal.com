import {
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationCircleIcon,
  ExclamationIcon,
  InformationCircleIcon,
  RefreshIcon,
} from "@heroicons/react/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { EventTypeCustomInputType } from "@prisma/client";
import { useContracts } from "contexts/contractsContext";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import { ReactMultiEmail } from "react-multi-email";
import { useMutation } from "react-query";
import { Frequency as RRuleFrequency } from "rrule";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  useEmbedNonStylesConfig,
  useIsBackgroundTransparent,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { createPaymentLink } from "@calcom/stripe/client";
import { Button } from "@calcom/ui/Button";
import { Tooltip } from "@calcom/ui/Tooltip";
import { EmailInput, Form } from "@calcom/ui/form/fields";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { ensureArray } from "@lib/ensureArray";
import useTheme from "@lib/hooks/useTheme";
import { LocationObject, LocationType } from "@lib/location";
import createBooking from "@lib/mutations/bookings/create-booking";
import createRecurringBooking from "@lib/mutations/bookings/create-recurring-booking";
import { parseDate, parseRecurringDates } from "@lib/parseDate";
import slugify from "@lib/slugify";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";

import CustomBranding from "@components/CustomBranding";
import AvatarGroup from "@components/ui/AvatarGroup";
import type PhoneInputType from "@components/ui/form/PhoneInput";

import { BookPageProps } from "../../../pages/[user]/book";
import { HashLinkPageProps } from "../../../pages/d/[link]/book";
import { TeamBookingPageProps } from "../../../pages/team/[slug]/book";

declare global {
  // eslint-disable-next-line no-var
  var web3: {
    currentProvider: {
      selectedAddress: string;
    };
  };
}

/** These are like 40kb that not every user needs */
const PhoneInput = dynamic(
  () => import("@components/ui/form/PhoneInput")
) as unknown as typeof PhoneInputType;

type BookingPageProps = BookPageProps | TeamBookingPageProps | HashLinkPageProps;

type BookingFormValues = {
  name: string;
  email: string;
  notes?: string;
  locationType?: LocationType;
  guests?: string[];
  phone?: string;
  hostPhoneNumber?: string; // Maybe come up with a better way to name this to distingish between two types of phone numbers
  customInputs?: {
    [key: string]: string | boolean;
  };
};

const BookingPage = ({
  eventType,
  booking,
  profile,
  isDynamicGroupBooking,
  recurringEventCount,
  locationLabels,
  hasHashedBookingLink,
  hashedLink,
}: BookingPageProps) => {
  const { t, i18n } = useLocale();
  const isEmbed = useIsEmbed();
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const router = useRouter();
  const { contracts } = useContracts();
  const { data: session } = useSession();
  const isBackgroundTransparent = useIsBackgroundTransparent();
  const telemetry = useTelemetry();

  useEffect(() => {
    telemetry.withJitsu((jitsu) =>
      jitsu.track(
        top !== window ? telemetryEventTypes.embedView : telemetryEventTypes.pageView,
        collectPageParameters("/book", { isTeamBooking: document.URL.includes("team/") })
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (eventType.metadata.smartContractAddress) {
      const eventOwner = eventType.users[0];

      if (!contracts[(eventType.metadata.smartContractAddress || null) as number])
        router.replace(`/${eventOwner.username}`);
    }
  }, [contracts, eventType.metadata.smartContractAddress, eventType.users, router]);

  const mutation = useMutation(createBooking, {
    onSuccess: async (responseData) => {
      const { id, attendees, paymentUid } = responseData;
      if (paymentUid) {
        return await router.push(
          createPaymentLink({
            paymentUid,
            date,
            name: attendees[0].name,
            email: attendees[0].email,
            absolute: false,
          })
        );
      }

      const location = (function humanReadableLocation(location) {
        if (!location) {
          return;
        }
        if (location.includes("integration")) {
          return t("web_conferencing_details_to_follow");
        }
        return location;
      })(responseData.location);

      return router.push({
        pathname: "/success",
        query: {
          date,
          type: eventType.id,
          eventSlug: eventType.slug,
          user: profile.slug,
          reschedule: !!rescheduleUid,
          name: attendees[0].name,
          email: attendees[0].email,
          location,
          eventName: profile.eventName || "",
          bookingId: id,
        },
      });
    },
  });

  const recurringMutation = useMutation(createRecurringBooking, {
    onSuccess: async (responseData = []) => {
      const { attendees = [], id, recurringEventId } = responseData[0] || {};
      const location = (function humanReadableLocation(location) {
        if (!location) {
          return;
        }
        if (location.includes("integration")) {
          return t("web_conferencing_details_to_follow");
        }
        return location;
      })(responseData[0].location);

      return router.push({
        pathname: "/success",
        query: {
          date,
          type: eventType.id,
          eventSlug: eventType.slug,
          recur: recurringEventId,
          user: profile.slug,
          reschedule: !!rescheduleUid,
          name: attendees[0].name,
          email: attendees[0].email,
          location,
          eventName: profile.eventName || "",
          bookingId: id,
        },
      });
    },
  });

  const rescheduleUid = router.query.rescheduleUid as string;
  const { isReady, Theme } = useTheme(profile.theme);
  const date = asStringOrNull(router.query.date);

  const [guestToggle, setGuestToggle] = useState(booking && booking.attendees.length > 1);

  const eventTypeDetail = { isWeb3Active: false, ...eventType };

  // it would be nice if Prisma at some point in the future allowed for Json<Location>; as of now this is not the case.
  const locations: LocationObject[] = useMemo(
    () => (eventType.locations as LocationObject[]) || [],
    [eventType.locations]
  );

  useEffect(() => {
    if (router.query.guest) {
      setGuestToggle(true);
    }
  }, [router.query.guest]);

  const locationInfo = (type: LocationType) => locations.find((location) => location.type === type);
  const loggedInIsOwner = eventType?.users[0]?.id === session?.user?.id;
  const guestListEmails = !isDynamicGroupBooking
    ? booking?.attendees.slice(1).map((attendee) => attendee.email)
    : [];

  const defaultValues = () => {
    if (!rescheduleUid) {
      return {
        name: loggedInIsOwner ? "" : session?.user?.name || (router.query.name as string) || "",
        email: loggedInIsOwner ? "" : session?.user?.email || (router.query.email as string) || "",
        notes: (router.query.notes as string) || "",
        guests: ensureArray(router.query.guest) as string[],
        customInputs: eventType.customInputs.reduce(
          (customInputs, input) => ({
            ...customInputs,
            [input.id]: router.query[slugify(input.label)],
          }),
          {}
        ),
      };
    }
    if (!booking || !booking.attendees.length) {
      return {};
    }
    const primaryAttendee = booking.attendees[0];
    if (!primaryAttendee) {
      return {};
    }

    const customInputType = booking.customInputs;
    return {
      name: primaryAttendee.name || "",
      email: primaryAttendee.email || "",
      guests: guestListEmails,
      notes: booking.description || "",
      customInputs: eventType.customInputs.reduce(
        (customInputs, input) => ({
          ...customInputs,
          [input.id]: booking.customInputs
            ? booking.customInputs[input.label as keyof typeof customInputType]
            : "",
        }),
        {}
      ),
    };
  };

  const bookingFormSchema = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
    })
    .passthrough();

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: defaultValues(),
    resolver: zodResolver(bookingFormSchema), // Since this isn't set to strict we only validate the fields in the schema
  });

  const selectedLocation = useWatch({
    control: bookingForm.control,
    name: "locationType",
    defaultValue: ((): LocationType | undefined => {
      if (router.query.location) {
        return router.query.location as LocationType;
      }
      if (locations.length === 1) {
        return locations[0]?.type;
      }
    })(),
  });

  const getLocationValue = (
    booking: Pick<BookingFormValues, "locationType" | "phone" | "hostPhoneNumber">
  ) => {
    const { locationType } = booking;
    switch (locationType) {
      case LocationType.Phone: {
        return booking.phone || "";
      }
      case LocationType.InPerson: {
        return locationInfo(locationType)?.address || "";
      }
      case LocationType.Link: {
        return locationInfo(locationType)?.link || "";
      }
      case LocationType.UserPhone: {
        return locationInfo(locationType)?.hostPhoneNumber || "";
      }
      // Catches all other location types, such as Google Meet, Zoom etc.
      default:
        return selectedLocation || "";
    }
  };

  // Calculate the booking date(s)
  let recurringStrings: string[] = [],
    recurringDates: Date[] = [];
  if (eventType.recurringEvent?.freq && recurringEventCount !== null) {
    [recurringStrings, recurringDates] = parseRecurringDates(
      {
        startDate: date,
        recurringEvent: eventType.recurringEvent,
        recurringCount: parseInt(recurringEventCount.toString()),
      },
      i18n
    );
  }

  const bookEvent = (booking: BookingFormValues) => {
    telemetry.withJitsu((jitsu) =>
      jitsu.track(
        top !== window ? telemetryEventTypes.embedBookingConfirmed : telemetryEventTypes.bookingConfirmed,
        collectPageParameters("/book", { isTeamBooking: document.URL.includes("team/") })
      )
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

    let web3Details: Record<"userWallet" | "userSignature", string> | undefined;
    if (eventTypeDetail.metadata.smartContractAddress) {
      web3Details = {
        userWallet: window.web3.currentProvider.selectedAddress,
        userSignature: contracts[(eventTypeDetail.metadata.smartContractAddress || null) as number],
      };
    }

    if (recurringDates.length) {
      // Identify set of bookings to one intance of recurring event to support batch changes
      const recurringEventId = uuidv4();
      const recurringBookings = recurringDates.map((recurringDate) => ({
        ...booking,
        web3Details,
        start: dayjs(recurringDate).format(),
        end: dayjs(recurringDate).add(eventType.length, "minute").format(),
        eventTypeId: eventType.id,
        eventTypeSlug: eventType.slug,
        recurringEventId,
        // Added to track down the number of actual occurrences selected by the user
        recurringCount: recurringDates.length,
        timeZone: timeZone(),
        language: i18n.language,
        rescheduleUid,
        user: router.query.user,
        location: getLocationValue(
          booking.locationType ? booking : { ...booking, locationType: selectedLocation }
        ),
        metadata,
        customInputs: Object.keys(booking.customInputs || {}).map((inputId) => ({
          label: eventType.customInputs.find((input) => input.id === parseInt(inputId))?.label || "",
          value: booking.customInputs && inputId in booking.customInputs ? booking.customInputs[inputId] : "",
        })),
        hasHashedBookingLink,
        hashedLink,
      }));
      recurringMutation.mutate(recurringBookings);
    } else {
      mutation.mutate({
        ...booking,
        web3Details,
        start: dayjs(date).format(),
        end: dayjs(date).add(eventType.length, "minute").format(),
        eventTypeId: eventType.id,
        eventTypeSlug: eventType.slug,
        timeZone: timeZone(),
        language: i18n.language,
        rescheduleUid,
        bookingUid: router.query.bookingUid as string,
        user: router.query.user,
        location: getLocationValue(
          booking.locationType ? booking : { ...booking, locationType: selectedLocation }
        ),
        metadata,
        customInputs: Object.keys(booking.customInputs || {}).map((inputId) => ({
          label: eventType.customInputs.find((input) => input.id === parseInt(inputId))?.label || "",
          value: booking.customInputs && inputId in booking.customInputs ? booking.customInputs[inputId] : "",
        })),
        hasHashedBookingLink,
        hashedLink,
      });
    }
  };

  const disableInput = !!rescheduleUid;
  const disabledExceptForOwner = disableInput && !loggedInIsOwner;
  const inputClassName =
    "focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black disabled:bg-gray-200 disabled:hover:cursor-not-allowed dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500 sm:text-sm";

  return (
    <div>
      <Theme />
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
          | Cal.com
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />
      <main
        className={classNames(
          shouldAlignCentrally ? "mx-auto" : "",
          isEmbed ? "" : "sm:my-24",
          "my-0 max-w-3xl "
        )}>
        {isReady && (
          <div
            className={classNames(
              "main overflow-hidden",
              isEmbed ? "" : "border border-gray-200",
              isBackgroundTransparent ? "" : "dark:border-1 bg-white dark:bg-gray-800",
              "rounded-md dark:border-gray-600 sm:border"
            )}>
            <div className="px-4 py-5 sm:flex sm:p-4">
              <div className="sm:w-1/2 sm:border-r sm:dark:border-gray-700">
                <AvatarGroup
                  border="border-2 border-white dark:border-gray-800"
                  size={14}
                  items={[{ image: profile.image || "", alt: profile.name || "" }].concat(
                    eventType.users
                      .filter((user) => user.name !== profile.name)
                      .map((user) => ({
                        image: user.avatar || "",
                        alt: user.name || "",
                      }))
                  )}
                />
                <h2 className="font-cal text-bookinglight mt-2 font-medium dark:text-gray-300">
                  {profile.name}
                </h2>
                <h1 className="text-bookingdark mb-4 text-xl font-semibold dark:text-white">
                  {eventType.title}
                </h1>
                {eventType.seatsPerTimeSlot && (
                  <p
                    className={`${
                      booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.5
                        ? "text-rose-600"
                        : booking && booking.attendees.length / eventType.seatsPerTimeSlot >= 0.33
                        ? "text-yellow-500"
                        : "text-emerald-400"
                    } mb-2`}>
                    {booking
                      ? eventType.seatsPerTimeSlot - booking.attendees.length
                      : eventType.seatsPerTimeSlot}{" "}
                    / {eventType.seatsPerTimeSlot} {t("seats_available")}
                  </p>
                )}
                {eventType?.description && (
                  <p className="text-bookinglight mb-2 dark:text-white">
                    <InformationCircleIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                    {eventType.description}
                  </p>
                )}
                <p className="text-bookinglight mb-2 dark:text-white">
                  <ClockIcon className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                  {eventType.length} {t("minutes")}
                </p>
                {eventType.price > 0 && (
                  <p className="text-bookinglight mb-1 -ml-2 px-2 py-1 dark:text-white">
                    <CreditCardIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4" />
                    <IntlProvider locale="en">
                      <FormattedNumber
                        value={eventType.price / 100.0}
                        style="currency"
                        currency={eventType.currency.toUpperCase()}
                      />
                    </IntlProvider>
                  </p>
                )}
                {!rescheduleUid && eventType.recurringEvent?.freq && recurringEventCount && (
                  <div className="mb-3 text-gray-600 dark:text-white">
                    <RefreshIcon className="mr-[10px] -mt-1 ml-[2px] inline-block h-4 w-4 text-gray-400" />
                    <p className="mb-1 -ml-2 inline px-2 py-1">
                      {`${t("every_for_freq", {
                        freq: t(`${RRuleFrequency[eventType.recurringEvent.freq].toString().toLowerCase()}`),
                      })} ${recurringEventCount} ${t(
                        `${RRuleFrequency[eventType.recurringEvent.freq].toString().toLowerCase()}`,
                        { count: parseInt(recurringEventCount.toString()) }
                      )}`}
                    </p>
                  </div>
                )}
                <div className="text-bookinghighlight mb-4 flex">
                  <CalendarIcon className="mr-[10px] ml-[2px] inline-block h-4 w-4" />
                  <div className="-mt-1">
                    {(rescheduleUid || !eventType.recurringEvent.freq) &&
                      parseDate(dayjs(date).tz(timeZone()), i18n)}
                    {!rescheduleUid &&
                      eventType.recurringEvent.freq &&
                      recurringStrings.slice(0, 5).map((aDate, key) => <p key={key}>{aDate}</p>)}
                    {!rescheduleUid && eventType.recurringEvent.freq && recurringStrings.length > 5 && (
                      <div className="flex">
                        <Tooltip
                          content={recurringStrings.slice(5).map((aDate, key) => (
                            <p key={key}>{aDate}</p>
                          ))}>
                          <p className="text-gray-600 dark:text-white">
                            {t("plus_more", { count: recurringStrings.length - 5 })}
                          </p>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
                {eventTypeDetail.isWeb3Active && eventType.metadata.smartContractAddress && (
                  <p className="text-bookinglight mb-1 -ml-2 px-2 py-1">
                    {t("requires_ownership_of_a_token") + " " + eventType.metadata.smartContractAddress}
                  </p>
                )}
                {booking?.startTime && rescheduleUid && (
                  <div>
                    <p className="mt-8 mb-2 text-gray-600 dark:text-white" data-testid="former_time_p">
                      {t("former_time")}
                    </p>
                    <p className="text-gray-500 line-through dark:text-white">
                      <CalendarIcon className="mr-[10px] ml-[2px] -mt-1 inline-block h-4 w-4 text-gray-400" />
                      {typeof booking.startTime === "string" && parseDate(dayjs(booking.startTime), i18n)}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-8 sm:w-1/2 sm:pl-8 sm:pr-4">
                <Form form={bookingForm} handleSubmit={bookEvent}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white">
                      {t("your_name")}
                    </label>
                    <div className="mt-1">
                      <input
                        {...bookingForm.register("name", { required: true })}
                        type="text"
                        name="name"
                        id="name"
                        required
                        className={inputClassName}
                        placeholder={t("example_name")}
                        disabled={disableInput}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 dark:text-white">
                      {t("email_address")}
                    </label>
                    <div className="mt-1">
                      <EmailInput
                        {...bookingForm.register("email")}
                        required
                        className={classNames(
                          inputClassName,
                          bookingForm.formState.errors.email
                            ? "border-red-700 focus:ring-red-700"
                            : " border-gray-300  dark:border-gray-900"
                        )}
                        placeholder="you@example.com"
                        type="search" // Disables annoying 1password intrusive popup (non-optimal, I know I know...)
                        disabled={disableInput}
                      />
                      {bookingForm.formState.errors.email && (
                        <div className="mt-2 flex items-center text-sm text-red-700 ">
                          <ExclamationCircleIcon className="mr-2 h-3 w-3" />
                          <p>{t("email_validation_error")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {locations.length > 1 && (
                    <div className="mb-4">
                      <span className="block text-sm font-medium text-gray-700 dark:text-white">
                        {t("location")}
                      </span>
                      {locations.map((location, i) => (
                        <label key={i} className="block">
                          <input
                            type="radio"
                            className="location h-4 w-4 border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
                            {...bookingForm.register("locationType", { required: true })}
                            value={location.type}
                            defaultChecked={selectedLocation === location.type}
                          />
                          <span className="text-sm ltr:ml-2 rtl:mr-2 dark:text-gray-500">
                            {locationLabels[location.type]}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedLocation === LocationType.Phone && (
                    <div className="mb-4">
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700 dark:text-white">
                        {t("phone_number")}
                      </label>
                      <div className="mt-1">
                        <PhoneInput<BookingFormValues>
                          control={bookingForm.control}
                          name="phone"
                          placeholder={t("enter_phone_number")}
                          id="phone"
                          required
                          disabled={disableInput}
                        />
                      </div>
                    </div>
                  )}
                  {eventType.customInputs
                    .sort((a, b) => a.id - b.id)
                    .map((input) => (
                      <div className="mb-4" key={input.id}>
                        {input.type !== EventTypeCustomInputType.BOOL && (
                          <label
                            htmlFor={"custom_" + input.id}
                            className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                            {input.label}
                          </label>
                        )}
                        {input.type === EventTypeCustomInputType.TEXTLONG && (
                          <textarea
                            {...bookingForm.register(`customInputs.${input.id}`, {
                              required: input.required,
                            })}
                            id={"custom_" + input.id}
                            rows={3}
                            className={inputClassName}
                            placeholder={input.placeholder}
                            disabled={disabledExceptForOwner}
                          />
                        )}
                        {input.type === EventTypeCustomInputType.TEXT && (
                          <input
                            type="text"
                            {...bookingForm.register(`customInputs.${input.id}`, {
                              required: input.required,
                            })}
                            id={"custom_" + input.id}
                            className={inputClassName}
                            placeholder={input.placeholder}
                            disabled={disabledExceptForOwner}
                          />
                        )}
                        {input.type === EventTypeCustomInputType.NUMBER && (
                          <input
                            type="number"
                            {...bookingForm.register(`customInputs.${input.id}`, {
                              required: input.required,
                            })}
                            id={"custom_" + input.id}
                            className={inputClassName}
                            placeholder=""
                            disabled={disabledExceptForOwner}
                          />
                        )}
                        {input.type === EventTypeCustomInputType.BOOL && (
                          <div className="flex h-5 items-center">
                            <input
                              type="checkbox"
                              {...bookingForm.register(`customInputs.${input.id}`, {
                                required: input.required,
                              })}
                              id={"custom_" + input.id}
                              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black disabled:bg-gray-200 ltr:mr-2 rtl:ml-2 disabled:dark:text-gray-500"
                              placeholder=""
                              disabled={disabledExceptForOwner}
                            />
                            <label
                              htmlFor={"custom_" + input.id}
                              className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                              {input.label}
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  {!eventType.disableGuests && (
                    <div className="mb-4">
                      {!guestToggle && (
                        <label
                          onClick={() => setGuestToggle(!guestToggle)}
                          htmlFor="guests"
                          className="mb-1 block text-sm font-medium hover:cursor-pointer dark:text-white">
                          {/*<UserAddIcon className="inline-block w-5 h-5 mr-1 -mt-1" />*/}
                          {t("additional_guests")}
                        </label>
                      )}
                      {guestToggle && (
                        <div>
                          <label
                            htmlFor="guests"
                            className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                            {t("guests")}
                          </label>
                          {!disableInput && (
                            <Controller
                              control={bookingForm.control}
                              name="guests"
                              render={({ field: { onChange, value } }) => (
                                <ReactMultiEmail
                                  className="relative"
                                  placeholder="guest@example.com"
                                  emails={value}
                                  onChange={onChange}
                                  getLabel={(
                                    email: string,
                                    index: number,
                                    removeEmail: (index: number) => void
                                  ) => {
                                    return (
                                      <div data-tag key={index} className="cursor-pointer">
                                        {email}
                                        {!disableInput && (
                                          <span data-tag-handle onClick={() => removeEmail(index)}>
                                            ×
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }}
                                />
                              )}
                            />
                          )}
                          {/* Custom code when guest emails should not be editable */}
                          {disableInput && guestListEmails && guestListEmails.length > 0 && (
                            <div data-tag className="react-multi-email">
                              {/* // @TODO: user owners are appearing as guest here when should be only user input */}
                              {guestListEmails.map((email, index) => {
                                return (
                                  <div key={index} className="cursor-pointer">
                                    <span data-tag>{email}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mb-4">
                    <label
                      htmlFor="notes"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-white">
                      {t("additional_notes")}
                    </label>
                    <textarea
                      {...bookingForm.register("notes")}
                      id="notes"
                      name="notes"
                      rows={3}
                      className={inputClassName}
                      placeholder={t("share_additional_notes")}
                      disabled={disabledExceptForOwner}
                    />
                  </div>
                  <div className="flex items-start space-x-2 rtl:space-x-reverse">
                    <Button
                      type="submit"
                      data-testid={rescheduleUid ? "confirm-reschedule-button" : "confirm-book-button"}
                      loading={mutation.isLoading}>
                      {rescheduleUid ? t("reschedule") : t("confirm")}
                    </Button>
                    <Button color="secondary" type="button" onClick={() => router.back()}>
                      {t("cancel")}
                    </Button>
                  </div>
                </Form>
                {mutation.isError && (
                  <div
                    data-testid="booking-fail"
                    className="mt-2 border-l-4 border-yellow-400 bg-yellow-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                      </div>
                      <div className="ltr:ml-3 rtl:mr-3">
                        <p className="text-sm text-yellow-700">
                          {rescheduleUid ? t("reschedule_fail") : t("booking_fail")}{" "}
                          {(mutation.error as HttpError)?.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BookingPage;
