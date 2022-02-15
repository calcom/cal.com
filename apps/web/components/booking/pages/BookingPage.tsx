import { CalendarIcon, ClockIcon, CreditCardIcon, ExclamationIcon } from "@heroicons/react/solid";
import { EventTypeCustomInputType } from "@prisma/client";
import { useContracts } from "contexts/contractsContext";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormattedNumber, IntlProvider } from "react-intl";
import { ReactMultiEmail } from "react-multi-email";
import { useMutation } from "react-query";
import { v4 as uuidv4 } from "uuid";

import { createPaymentLink } from "@ee/lib/stripe/client";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { ensureArray } from "@lib/ensureArray";
import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import { LocationType } from "@lib/location";
import createBooking from "@lib/mutations/bookings/create-booking";
import { parseZone } from "@lib/parseZone";
import slugify from "@lib/slugify";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";

import CustomBranding from "@components/CustomBranding";
import { EmailInput, Form } from "@components/form/fields";
import AvatarGroup from "@components/ui/AvatarGroup";
import { Button } from "@components/ui/Button";

import { BookPageProps } from "../../../pages/[user]/book";
import { TeamBookingPageProps } from "../../../pages/team/[slug]/book";

/** These are like 40kb that not every user needs */
const PhoneInput = dynamic(() => import("@components/ui/form/PhoneInput"));

type BookingPageProps = BookPageProps | TeamBookingPageProps;

type BookingFormValues = {
  name: string;
  email: string;
  notes?: string;
  locationType?: LocationType;
  guests?: string[];
  phone?: string;
  customInputs?: {
    [key: string]: string;
  };
};

const BookingPage = (props: BookingPageProps) => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const { contracts } = useContracts();
  const { eventType } = props;

  useEffect(() => {
    if (eventType.metadata.smartContractAddress) {
      const eventOwner = eventType.users[0];

      if (!contracts[(eventType.metadata.smartContractAddress || null) as number])
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        /* @ts-ignore */
        router.replace(`/${eventOwner.username}`);
    }
  }, [contracts, eventType.metadata.smartContractAddress, router]);

  const mutation = useMutation(createBooking, {
    onSuccess: async ({ attendees, paymentUid, ...responseData }) => {
      if (paymentUid) {
        return await router.push(
          createPaymentLink({
            paymentUid,
            date,
            name: attendees[0].name,
            absolute: false,
          })
        );
      }

      const location = (function humanReadableLocation(location) {
        if (!location) {
          return;
        }
        if (location === "integrations:jitsi") {
          return "https://meet.jit.si/cal/" + uuidv4();
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
          type: props.eventType.id,
          user: props.profile.slug,
          reschedule: !!rescheduleUid,
          name: attendees[0].name,
          email: attendees[0].email,
          location,
        },
      });
    },
  });

  const rescheduleUid = router.query.rescheduleUid as string;
  const { isReady, Theme } = useTheme(props.profile.theme);

  const date = asStringOrNull(router.query.date);
  const timeFormat = asStringOrNull(router.query.clock) === "24h" ? "H:mm" : "h:mma";

  const [guestToggle, setGuestToggle] = useState(props.booking && props.booking.attendees.length > 1);

  const eventTypeDetail = { isWeb3Active: false, ...props.eventType };

  type Location = { type: LocationType; address?: string };
  // it would be nice if Prisma at some point in the future allowed for Json<Location>; as of now this is not the case.
  const locations: Location[] = useMemo(
    () => (props.eventType.locations as Location[]) || [],
    [props.eventType.locations]
  );

  useEffect(() => {
    if (router.query.guest) {
      setGuestToggle(true);
    }
  }, [router.query.guest]);

  const telemetry = useTelemetry();

  const locationInfo = (type: LocationType) => locations.find((location) => location.type === type);

  // TODO: Move to translations
  const locationLabels = {
    [LocationType.InPerson]: t("in_person_meeting"),
    [LocationType.Phone]: t("phone_call"),
    [LocationType.GoogleMeet]: "Google Meet",
    [LocationType.Zoom]: "Zoom Video",
    [LocationType.Jitsi]: "Jitsi Meet",
    [LocationType.Daily]: "Daily.co Video",
    [LocationType.Huddle01]: "Huddle01 Video",
    [LocationType.Tandem]: "Tandem Video",
  };

  const defaultValues = () => {
    if (!rescheduleUid) {
      return {
        name: (router.query.name as string) || "",
        email: (router.query.email as string) || "",
        notes: (router.query.notes as string) || "",
        guests: ensureArray(router.query.guest) as string[],
        customInputs: props.eventType.customInputs.reduce(
          (customInputs, input) => ({
            ...customInputs,
            [input.id]: router.query[slugify(input.label)],
          }),
          {}
        ),
      };
    }
    if (!props.booking || !props.booking.attendees.length) {
      return {};
    }
    const primaryAttendee = props.booking.attendees[0];
    if (!primaryAttendee) {
      return {};
    }
    return {
      name: primaryAttendee.name || "",
      email: primaryAttendee.email || "",
      guests: props.booking.attendees.slice(1).map((attendee) => attendee.email),
    };
  };

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: defaultValues(),
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

  const getLocationValue = (booking: Pick<BookingFormValues, "locationType" | "phone">) => {
    const { locationType } = booking;
    switch (locationType) {
      case LocationType.Phone: {
        return booking.phone || "";
      }
      case LocationType.InPerson: {
        return locationInfo(locationType)?.address || "";
      }
      // Catches all other location types, such as Google Meet, Zoom etc.
      default:
        return selectedLocation || "";
    }
  };

  const parseDate = (date: string | null) => {
    if (!date) return "No date";
    const parsedZone = parseZone(date);
    if (!parsedZone?.isValid()) return "Invalid date";
    const formattedTime = parsedZone?.format(timeFormat);
    return formattedTime + ", " + dayjs(date).toDate().toLocaleString(i18n.language, { dateStyle: "full" });
  };

  const bookEvent = (booking: BookingFormValues) => {
    telemetry.withJitsu((jitsu) =>
      jitsu.track(telemetryEventTypes.bookingConfirmed, collectPageParameters())
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

    let web3Details;
    if (eventTypeDetail.metadata.smartContractAddress) {
      web3Details = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        userWallet: window.web3.currentProvider.selectedAddress,
        userSignature: contracts[(eventTypeDetail.metadata.smartContractAddress || null) as number],
      };
    }

    mutation.mutate({
      ...booking,
      web3Details,
      start: dayjs(date).format(),
      end: dayjs(date).add(props.eventType.length, "minute").format(),
      eventTypeId: props.eventType.id,
      timeZone: timeZone(),
      language: i18n.language,
      rescheduleUid,
      user: router.query.user,
      location: getLocationValue(booking.locationType ? booking : { locationType: selectedLocation }),
      metadata,
      customInputs: Object.keys(booking.customInputs || {}).map((inputId) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        label: props.eventType.customInputs.find((input) => input.id === parseInt(inputId))!.label,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        value: booking.customInputs![inputId],
      })),
    });
  };

  return (
    <div>
      <Theme />
      <Head>
        <title>
          {rescheduleUid
            ? t("booking_reschedule_confirmation", {
                eventTypeTitle: props.eventType.title,
                profileName: props.profile.name,
              })
            : t("booking_confirmation", {
                eventTypeTitle: props.eventType.title,
                profileName: props.profile.name,
              })}{" "}
          | Cal.com
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <CustomBranding val={props.profile.brandColor} />
      <main className=" mx-auto my-0 max-w-3xl rounded-sm sm:my-24 sm:border sm:dark:border-gray-600">
        {isReady && (
          <div className="overflow-hidden border border-gray-200 bg-white dark:border-0 dark:bg-neutral-900 sm:rounded-sm">
            <div className="px-4 py-5 sm:flex sm:p-4">
              <div className="sm:w-1/2 sm:border-r sm:dark:border-gray-800">
                <AvatarGroup
                  size={14}
                  items={[{ image: props.profile.image || "", alt: props.profile.name || "" }].concat(
                    props.eventType.users
                      .filter((user) => user.name !== props.profile.name)
                      .map((user) => ({
                        image: user.avatar || "",
                        alt: user.name || "",
                      }))
                  )}
                />
                <h2 className="font-cal mt-2 font-medium text-gray-500 dark:text-gray-300">
                  {props.profile.name}
                </h2>
                <h1 className="mb-4 text-3xl font-semibold text-gray-800 dark:text-white">
                  {props.eventType.title}
                </h1>
                <p className="mb-2 text-gray-500">
                  <ClockIcon className="mr-1 -mt-1 inline-block h-4 w-4" />
                  {props.eventType.length} {t("minutes")}
                </p>
                {props.eventType.price > 0 && (
                  <p className="mb-1 -ml-2 px-2 py-1 text-gray-500">
                    <CreditCardIcon className="mr-1 -mt-1 inline-block h-4 w-4" />
                    <IntlProvider locale="en">
                      <FormattedNumber
                        value={props.eventType.price / 100.0}
                        style="currency"
                        currency={props.eventType.currency.toUpperCase()}
                      />
                    </IntlProvider>
                  </p>
                )}
                <p className="mb-4 text-green-500">
                  <CalendarIcon className="mr-1 -mt-1 inline-block h-4 w-4" />
                  {parseDate(date)}
                </p>
                {eventTypeDetail.isWeb3Active && eventType.metadata.smartContractAddress && (
                  <p className="mb-1 -ml-2 px-2 py-1 text-gray-500">
                    {t("requires_ownership_of_a_token") + " " + eventType.metadata.smartContractAddress}
                  </p>
                )}
                <p className="mb-8 text-gray-600 dark:text-white">{props.eventType.description}</p>
              </div>
              <div className="sm:w-1/2 sm:pl-8 sm:pr-4">
                <Form form={bookingForm} handleSubmit={bookEvent}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white">
                      {t("your_name")}
                    </label>
                    <div className="mt-1">
                      <input
                        {...bookingForm.register("name")}
                        type="text"
                        name="name"
                        id="name"
                        required
                        className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-black dark:text-white sm:text-sm"
                        placeholder={t("example_name")}
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
                        className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-black dark:text-white sm:text-sm"
                        placeholder="you@example.com"
                      />
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
                        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                        {/* @ts-ignore */}
                        <PhoneInput name="phone" placeholder={t("enter_phone_number")} id="phone" required />
                      </div>
                    </div>
                  )}
                  {props.eventType.customInputs
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
                            className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-black dark:text-white sm:text-sm"
                            placeholder={input.placeholder}
                          />
                        )}
                        {input.type === EventTypeCustomInputType.TEXT && (
                          <input
                            type="text"
                            {...bookingForm.register(`customInputs.${input.id}`, {
                              required: input.required,
                            })}
                            id={"custom_" + input.id}
                            className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-black dark:text-white sm:text-sm"
                            placeholder={input.placeholder}
                          />
                        )}
                        {input.type === EventTypeCustomInputType.NUMBER && (
                          <input
                            type="number"
                            {...bookingForm.register(`customInputs.${input.id}`, {
                              required: input.required,
                            })}
                            id={"custom_" + input.id}
                            className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-black dark:text-white sm:text-sm"
                            placeholder=""
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
                              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
                              placeholder=""
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
                  {!props.eventType.disableGuests && (
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
                                    <div data-tag key={index}>
                                      {email}
                                      <span data-tag-handle onClick={() => removeEmail(index)}>
                                        ×
                                      </span>
                                    </div>
                                  );
                                }}
                              />
                            )}
                          />
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
                      rows={3}
                      className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-black dark:text-white sm:text-sm"
                      placeholder={t("share_additional_notes")}
                    />
                  </div>
                  <div className="flex items-start space-x-2 rtl:space-x-reverse">
                    <Button type="submit" loading={mutation.isLoading}>
                      {rescheduleUid ? t("reschedule") : t("confirm")}
                    </Button>
                    <Button color="secondary" type="button" onClick={() => router.back()}>
                      {t("cancel")}
                    </Button>
                  </div>
                </Form>
                {mutation.isError && (
                  <div className="mt-2 border-l-4 border-yellow-400 bg-yellow-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                      </div>
                      <div className="ltr:ml-3 rtl:mr-3">
                        <p className="text-sm text-yellow-700">
                          {rescheduleUid ? t("reschedule_fail") : t("booking_fail")}
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
