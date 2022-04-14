import { CalendarIcon, ClockIcon, CreditCardIcon, ExclamationIcon } from "@heroicons/react/solid";
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

import { useIsEmbed, useEmbedStyles, useIsBackgroundTransparent } from "@calcom/embed-core";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { createPaymentLink } from "@calcom/stripe/client";
import { Button } from "@calcom/ui/Button";
import { EmailInput, Form } from "@calcom/ui/form/fields";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { ensureArray } from "@lib/ensureArray";
import useTheme from "@lib/hooks/useTheme";
import { LocationType } from "@lib/location";
import createBooking from "@lib/mutations/bookings/create-booking";
import { parseZone } from "@lib/parseZone";
import slugify from "@lib/slugify";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { detectBrowserTimeFormat } from "@lib/timeFormat";

import CustomBranding from "@components/CustomBranding";
import AvatarGroup from "@components/ui/AvatarGroup";
import type PhoneInputType from "@components/ui/form/PhoneInput";

import { BookPageProps } from "../../../pages/[user]/book";
import { TeamBookingPageProps } from "../../../pages/team/[slug]/book";

/** These are like 40kb that not every user needs */
const PhoneInput = dynamic(
  () => import("@components/ui/form/PhoneInput")
) as unknown as typeof PhoneInputType;

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

const BookingPage = ({
  eventType,
  booking,
  profile,
  isDynamicGroupBooking,
  locationLabels,
}: BookingPageProps) => {
  const { t, i18n } = useLocale();
  const isEmbed = useIsEmbed();
  const shouldAlignCentrallyInEmbed = useEmbedStyles("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const router = useRouter();
  const { contracts } = useContracts();
  const { data: session } = useSession();
  const isBackgroundTransparent = useIsBackgroundTransparent();

  useEffect(() => {
    if (eventType.metadata.smartContractAddress) {
      const eventOwner = eventType.users[0];

      if (!contracts[(eventType.metadata.smartContractAddress || null) as number])
        /* @ts-ignore */
        router.replace(`/${eventOwner.username}`);
    }
  }, [contracts, eventType.metadata.smartContractAddress, router]);

  const mutation = useMutation(createBooking, {
    onSuccess: async (responseData) => {
      const { attendees, paymentUid } = responseData;
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
        },
      });
    },
  });

  const rescheduleUid = router.query.rescheduleUid as string;
  const { isReady, Theme } = useTheme(profile.theme);
  const date = asStringOrNull(router.query.date);

  const [guestToggle, setGuestToggle] = useState(booking && booking.attendees.length > 1);

  const eventTypeDetail = { isWeb3Active: false, ...eventType };

  type Location = { type: LocationType; address?: string; link?: string };
  // it would be nice if Prisma at some point in the future allowed for Json<Location>; as of now this is not the case.
  const locations: Location[] = useMemo(
    () => (eventType.locations as Location[]) || [],
    [eventType.locations]
  );

  useEffect(() => {
    if (router.query.guest) {
      setGuestToggle(true);
    }
  }, [router.query.guest]);

  const telemetry = useTelemetry();

  const locationInfo = (type: LocationType) => locations.find((location) => location.type === type);
  const loggedInIsOwner = eventType?.users[0]?.name === session?.user?.name;
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
    return {
      name: primaryAttendee.name || "",
      email: primaryAttendee.email || "",
      guests: !isDynamicGroupBooking ? booking.attendees.slice(1).map((attendee) => attendee.email) : [],
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
      case LocationType.Link: {
        return locationInfo(locationType)?.link || "";
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
    const formattedTime = parsedZone?.format(detectBrowserTimeFormat);
    return formattedTime + ", " + dayjs(date).toDate().toLocaleString(i18n.language, { dateStyle: "full" });
  };

  const bookEvent = (booking: BookingFormValues) => {
    telemetry.withJitsu((jitsu) =>
      jitsu.track(
        telemetryEventTypes.bookingConfirmed,
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

    let web3Details;
    if (eventTypeDetail.metadata.smartContractAddress) {
      web3Details = {
        // @ts-ignore
        userWallet: window.web3.currentProvider.selectedAddress,
        userSignature: contracts[(eventTypeDetail.metadata.smartContractAddress || null) as number],
      };
    }

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
      user: router.query.user,
      location: getLocationValue(
        booking.locationType ? booking : { ...booking, locationType: selectedLocation }
      ),
      metadata,
      customInputs: Object.keys(booking.customInputs || {}).map((inputId) => ({
        label: eventType.customInputs.find((input) => input.id === parseInt(inputId))!.label,
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
          "my-0 max-w-3xl rounded-sm sm:my-24 sm:border sm:dark:border-gray-600"
        )}>
        {isReady && (
          <div
            className={classNames(
              "overflow-hidden",
              isEmbed ? "" : "border border-gray-200",
              isBackgroundTransparent ? "" : "bg-white dark:border-0 dark:bg-gray-800",
              "sm:rounded-sm"
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
                <h1 className="text-bookingdark mb-4 text-3xl font-semibold dark:text-white">
                  {eventType.title}
                </h1>
                <p className="text-bookinglight mb-2">
                  <ClockIcon className="mr-1 -mt-1 inline-block h-4 w-4" />
                  {eventType.length} {t("minutes")}
                </p>
                {eventType.price > 0 && (
                  <p className="text-bookinglight mb-1 -ml-2 px-2 py-1">
                    <CreditCardIcon className="mr-1 -mt-1 inline-block h-4 w-4" />
                    <IntlProvider locale="en">
                      <FormattedNumber
                        value={eventType.price / 100.0}
                        style="currency"
                        currency={eventType.currency.toUpperCase()}
                      />
                    </IntlProvider>
                  </p>
                )}
                <p className="text-bookinghighlight mb-4">
                  <CalendarIcon className="mr-1 -mt-1 inline-block h-4 w-4" />
                  {parseDate(date)}
                </p>
                {eventTypeDetail.isWeb3Active && eventType.metadata.smartContractAddress && (
                  <p className="text-bookinglight mb-1 -ml-2 px-2 py-1">
                    {t("requires_ownership_of_a_token") + " " + eventType.metadata.smartContractAddress}
                  </p>
                )}
                <p className="mb-8 text-gray-600 dark:text-white">{eventType.description}</p>
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
                        className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 sm:text-sm"
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
                        className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 sm:text-sm"
                        placeholder="you@example.com"
                        type="search" // Disables annoying 1password intrusive popup (non-optimal, I know I know...)
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
                        <PhoneInput<BookingFormValues>
                          control={bookingForm.control}
                          name="phone"
                          placeholder={t("enter_phone_number")}
                          id="phone"
                          required
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
                            className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 sm:text-sm"
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
                            className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 sm:text-sm"
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
                            className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 sm:text-sm"
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
                      className="focus:border-brand block w-full rounded-sm border-gray-300 shadow-sm focus:ring-black dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 sm:text-sm"
                      placeholder={t("share_additional_notes")}
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
