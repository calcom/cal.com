import {
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationIcon,
  LocationMarkerIcon,
} from "@heroicons/react/solid";
import { EventTypeCustomInputType } from "@prisma/client";
import dayjs from "dayjs";
import Head from "next/head";
import { useRouter } from "next/router";
import { stringify } from "querystring";
import { useCallback, useEffect, useState } from "react";
import { FormattedNumber, IntlProvider } from "react-intl";
import { ReactMultiEmail } from "react-multi-email";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { createPaymentLink } from "@ee/lib/stripe/client";

import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import { LocationType } from "@lib/location";
import createBooking from "@lib/mutations/bookings/create-booking";
import { parseZone } from "@lib/parseZone";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { BookingCreateBody } from "@lib/types/booking";

import AvatarGroup from "@components/ui/AvatarGroup";
import { Button } from "@components/ui/Button";

import { BookPageProps } from "../../../pages/[user]/book";
import { TeamBookingPageProps } from "../../../pages/team/[slug]/book";

type BookingPageProps = BookPageProps | TeamBookingPageProps;

const BookingPage = (props: BookingPageProps) => {
  const { t } = useLocale({ localeProp: props.localeProp });
  const router = useRouter();
  const { rescheduleUid } = router.query;
  const { isReady } = useTheme(props.profile.theme);

  const date = asStringOrNull(router.query.date);
  const timeFormat = asStringOrNull(router.query.clock) === "24h" ? "H:mm" : "h:mma";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [guestToggle, setGuestToggle] = useState(false);
  const [guestEmails, setGuestEmails] = useState([]);
  const locations = props.eventType.locations || [];

  const [selectedLocation, setSelectedLocation] = useState<LocationType>(
    locations.length === 1 ? locations[0].type : ""
  );

  const telemetry = useTelemetry();

  useEffect(() => {
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.timeSelected, collectPageParameters()));
  }, []);

  function toggleGuestEmailInput() {
    setGuestToggle(!guestToggle);
  }

  const locationInfo = (type: LocationType) => locations.find((location) => location.type === type);

  // TODO: Move to translations
  const locationLabels = {
    [LocationType.InPerson]: t("in_person_meeting"),
    [LocationType.Phone]: t("phone_call"),
    [LocationType.GoogleMeet]: "Google Meet",
    [LocationType.Zoom]: "Zoom Video",
    [LocationType.Daily]: "Daily.co Video",
  };

  const _bookingHandler = (event) => {
    const book = async () => {
      setLoading(true);
      setError(false);
      let notes = "";
      if (props.eventType.customInputs) {
        notes = props.eventType.customInputs
          .map((input) => {
            const data = event.target["custom_" + input.id];
            if (data) {
              if (input.type === EventTypeCustomInputType.BOOL) {
                return input.label + "\n" + (data.checked ? t("yes") : t("no"));
              } else {
                return input.label + "\n" + data.value;
              }
            }
          })
          .join("\n\n");
      }
      if (!!notes && !!event.target.notes.value) {
        notes += `\n\n${t("additional_notes")}:\n` + event.target.notes.value;
      } else {
        notes += event.target.notes.value;
      }

      const payload: BookingCreateBody = {
        start: dayjs(date).format(),
        end: dayjs(date).add(props.eventType.length, "minute").format(),
        name: event.target.name.value,
        email: event.target.email.value,
        notes: notes,
        guests: guestEmails,
        eventTypeId: props.eventType.id,
        timeZone: timeZone(),
      };
      if (typeof rescheduleUid === "string") payload.rescheduleUid = rescheduleUid;
      if (typeof router.query.user === "string") payload.user = router.query.user;

      if (selectedLocation) {
        switch (selectedLocation) {
          case LocationType.Phone:
            payload["location"] = event.target.phone.value;
            break;

          case LocationType.InPerson:
            payload["location"] = locationInfo(selectedLocation).address;
            break;

          // Catches all other location types, such as Google Meet, Zoom etc.
          default:
            payload["location"] = selectedLocation;
        }
      }

      telemetry.withJitsu((jitsu) =>
        jitsu.track(telemetryEventTypes.bookingConfirmed, collectPageParameters())
      );

      const content = await createBooking(payload).catch((e) => {
        console.error(e.message);
        setLoading(false);
        setError(true);
      });

      if (content?.id) {
        const params: { [k: string]: any } = {
          date,
          type: props.eventType.id,
          user: props.profile.slug,
          reschedule: !!rescheduleUid,
          name: payload.name,
          email: payload.email,
        };

        if (payload["location"]) {
          if (payload["location"].includes("integration")) {
            params.location = "Web conferencing details to follow.";
          } else {
            params.location = payload["location"];
          }
        }

        const query = stringify(params);
        let successUrl = `/success?${query}`;

        if (content?.paymentUid) {
          successUrl = createPaymentLink({
            paymentUid: content?.paymentUid,
            name: payload.name,
            date,
            absolute: false,
          });
        }

        await router.push(successUrl);
      } else {
        setLoading(false);
        setError(true);
      }
    };

    event.preventDefault();
    book();
  };

  const bookingHandler = useCallback(_bookingHandler, [guestEmails]);

  return (
    <div>
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

      <main className="max-w-3xl mx-auto my-0 sm:my-24">
        {isReady && (
          <div className="overflow-hidden bg-white border border-gray-200 dark:bg-neutral-900 dark:border-0 sm:rounded-sm">
            <div className="px-4 py-5 sm:flex sm:p-4">
              <div className="sm:w-1/2 sm:border-r sm:dark:border-black">
                <AvatarGroup
                  size={16}
                  items={[{ image: props.profile.image, alt: props.profile.name }].concat(
                    props.eventType.users
                      .filter((user) => user.name !== props.profile.name)
                      .map((user) => ({
                        image: user.avatar,
                        title: user.name,
                      }))
                  )}
                />
                <h2 className="font-medium text-gray-500 font-cal dark:text-gray-300">
                  {props.profile.name}
                </h2>
                <h1 className="mb-4 text-3xl font-semibold text-gray-800 dark:text-white">
                  {props.eventType.title}
                </h1>
                <p className="mb-2 text-gray-500">
                  <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                  {props.eventType.length} {t("minutes")}
                </p>
                {props.eventType.price > 0 && (
                  <p className="px-2 py-1 mb-1 -ml-2 text-gray-500">
                    <CreditCardIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                    <IntlProvider locale="en">
                      <FormattedNumber
                        value={props.eventType.price / 100.0}
                        style="currency"
                        currency={props.eventType.currency.toUpperCase()}
                      />
                    </IntlProvider>
                  </p>
                )}
                {selectedLocation === LocationType.InPerson && (
                  <p className="mb-2 text-gray-500">
                    <LocationMarkerIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                    {locationInfo(selectedLocation).address}
                  </p>
                )}
                <p className="mb-4 text-green-500">
                  <CalendarIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                  {parseZone(date).format(timeFormat + ", dddd DD MMMM YYYY")}
                </p>
                <p className="mb-8 text-gray-600 dark:text-white">{props.eventType.description}</p>
              </div>
              <div className="sm:w-1/2 sm:pl-8 sm:pr-4">
                <form onSubmit={bookingHandler}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white">
                      {t("your_name")}
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                        placeholder="John Doe"
                        defaultValue={props.booking ? props.booking.attendees[0].name : ""}
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
                      <input
                        type="email"
                        name="email"
                        id="email"
                        inputMode="email"
                        required
                        className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                        placeholder="you@example.com"
                        defaultValue={props.booking ? props.booking.attendees[0].email : ""}
                      />
                    </div>
                  </div>
                  {locations.length > 1 && (
                    <div className="mb-4">
                      <span className="block text-sm font-medium text-gray-700 dark:text-white">
                        {t("location")}
                      </span>
                      {locations.map((location) => (
                        <label key={location.type} className="block">
                          <input
                            type="radio"
                            required
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-4 h-4 mr-2 text-black border-gray-300 location focus:ring-black"
                            name="location"
                            value={location.type}
                            checked={selectedLocation === location.type}
                          />
                          <span className="ml-2 text-sm dark:text-gray-500">
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
                        <PhoneInput
                          name="phone"
                          placeholder={t("enter_phone_number")}
                          id="phone"
                          required
                          className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                          onChange={() => {
                            /* DO NOT REMOVE: Callback required by PhoneInput, comment added to satisfy eslint:no-empty-function */
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {props.eventType.customInputs &&
                    props.eventType.customInputs
                      .sort((a, b) => a.id - b.id)
                      .map((input) => (
                        <div className="mb-4" key={"input-" + input.label.toLowerCase}>
                          {input.type !== EventTypeCustomInputType.BOOL && (
                            <label
                              htmlFor={"custom_" + input.id}
                              className="block mb-1 text-sm font-medium text-gray-700 dark:text-white">
                              {input.label}
                            </label>
                          )}
                          {input.type === EventTypeCustomInputType.TEXTLONG && (
                            <textarea
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              rows={3}
                              className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                              placeholder={input.placeholder}
                            />
                          )}
                          {input.type === EventTypeCustomInputType.TEXT && (
                            <input
                              type="text"
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                              placeholder={input.placeholder}
                            />
                          )}
                          {input.type === EventTypeCustomInputType.NUMBER && (
                            <input
                              type="number"
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                              placeholder=""
                            />
                          )}
                          {input.type === EventTypeCustomInputType.BOOL && (
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                name={"custom_" + input.id}
                                id={"custom_" + input.id}
                                className="w-4 h-4 mr-2 text-black border-gray-300 rounded focus:ring-black"
                                placeholder=""
                                required={input.required}
                              />
                              <label
                                htmlFor={"custom_" + input.id}
                                className="block mb-1 text-sm font-medium text-gray-700 dark:text-white">
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
                          onClick={toggleGuestEmailInput}
                          htmlFor="guests"
                          className="block mb-1 text-sm font-medium text-blue-500 dark:text-white hover:cursor-pointer">
                          {t("additional_guests")}
                        </label>
                      )}
                      {guestToggle && (
                        <div>
                          <label
                            htmlFor="guests"
                            className="block mb-1 text-sm font-medium text-gray-700 dark:text-white">
                            Guests
                          </label>
                          <ReactMultiEmail
                            className="relative"
                            placeholder="guest@example.com"
                            emails={guestEmails}
                            onChange={(_emails: string[]) => {
                              setGuestEmails(_emails);
                            }}
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
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mb-4">
                    <label
                      htmlFor="notes"
                      className="block mb-1 text-sm font-medium text-gray-700 dark:text-white">
                      {t("additional_notes")}
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                      placeholder={t("share_additional_notes")}
                      defaultValue={props.booking ? props.booking.description : ""}
                    />
                  </div>
                  <div className="flex items-start space-x-2">
                    {/* TODO: add styling props to <Button variant="" color="" /> and get rid of btn-primary */}
                    <Button type="submit" loading={loading}>
                      {rescheduleUid ? t("reschedule") : t("confirm")}
                    </Button>
                    <Button color="secondary" type="button" onClick={() => router.back()}>
                      {t("cancel")}
                    </Button>
                  </div>
                </form>
                {error && (
                  <div className="p-4 mt-2 border-l-4 border-yellow-400 bg-yellow-50">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationIcon className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
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
