import Head from "next/head";
import { useRouter } from "next/router";
import { useIntl } from "react-intl";
import { CalendarIcon, ClockIcon, ExclamationIcon, LocationMarkerIcon } from "@heroicons/react/solid";
import { EventTypeCustomInputType } from "@prisma/client";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import T from "@components/T";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import { LocationType } from "@lib/location";
import { Button } from "@components/ui/Button";
import { ReactMultiEmail } from "react-multi-email";
import { asStringOrNull } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import useTheme from "@lib/hooks/useTheme";
import AvatarGroup from "@components/ui/AvatarGroup";
import { parseZone } from "@lib/parseZone";
import { es } from "dayjs/locale/es";
import localeData from "dayjs/plugin/localeData";

dayjs.locale(es);
dayjs.extend(localeData);

const BookingPage = (props: any): JSX.Element => {
  const router = useRouter();
  const intl = useIntl();
  const { locale = "en" } = router;
  const { rescheduleUid } = router.query;
  const themeLoaded = useTheme(props.profile.theme);

  const date = asStringOrNull(router.query.date);
  const timeFormat = asStringOrNull(router.query.clock) === "24h" ? "H:mm" : "h:mma";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [guestToggle, setGuestToggle] = useState(false);
  const [guestEmails, setGuestEmails] = useState([]);
  const locations = props.eventType.locations || [];
  dayjs.locale(locale);

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
  const locationLabels: { [index: string]: string } = {
    [LocationType.InPerson]: "Link or In-person meeting",
    [LocationType.Phone]: "Phone call",
    [LocationType.GoogleMeet]: "Google Meet",
    [LocationType.Zoom]: "Zoom Video",
  };

  const bookingHandler = (event) => {
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
                return input.label + "\n" + (data.checked ? "Yes" : "No");
              } else {
                return input.label + "\n" + data.value;
              }
            }
          })
          .join("\n\n");
      }
      if (!!notes && !!event.target.notes.value) {
        notes += "\n\nAdditional notes:\n" + event.target.notes.value;
      } else {
        notes += event.target.notes.value;
      }

      const payload = {
        start: dayjs(date).format(),
        end: dayjs(date).add(props.eventType.length, "minute").format(),
        name: event.target.name.value,
        email: event.target.email.value,
        notes: notes,
        guests: guestEmails,
        eventTypeId: props.eventType.id,
        rescheduleUid: rescheduleUid,
        timeZone: timeZone(),
      };

      if (router.query.user) {
        payload.user = router.query.user;
      }

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

      /*const res = await */ fetch("/api/book/event", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      // TODO When the endpoint is fixed, change this to await the result again
      //if (res.ok) {
      let successUrl = `/success?date=${encodeURIComponent(date)}&type=${props.eventType.id}&user=${
        props.profile.slug
      }&reschedule=${!!rescheduleUid}&name=${payload.name}`;
      if (payload["location"]) {
        if (payload["location"].includes("integration")) {
          successUrl += "&location=" + encodeURIComponent("Web conferencing details to follow.");
        } else {
          successUrl += "&location=" + encodeURIComponent(payload["location"]);
        }
      }

      await router.push(successUrl);
    };

    event.preventDefault();
    book();
  };

  return (
    themeLoaded && (
      <div>
        <Head>
          <title>
            {rescheduleUid ? "Reschedule" : "Confirm"} your {props.eventType.title} with {props.profile.name}{" "}
            | Cal.com
          </title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-3xl mx-auto my-0 sm:my-24">
          <div className="dark:bg-neutral-900 bg-white overflow-hidden border border-gray-200 dark:border-0 sm:rounded-sm">
            <div className="sm:flex px-4 py-5 sm:p-4">
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
                <h2 className="font-medium dark:text-gray-300 text-gray-500">{props.profile.name}</h2>
                <h1 className="text-3xl font-semibold dark:text-white text-gray-800 mb-4">
                  {props.eventType.title}
                </h1>
                <p className="text-gray-500 mb-2">
                  <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                  {props.eventType.length} <T>minutes</T>
                </p>
                {selectedLocation === LocationType.InPerson && (
                  <p className="text-gray-500 mb-2">
                    <LocationMarkerIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                    {locationInfo(selectedLocation).address}
                  </p>
                )}
                <p className="text-green-500 mb-4">
                  <CalendarIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                  {parseZone(date).format(timeFormat + ", dddd DD MMMM YYYY")}
                </p>
                <p className="dark:text-white text-gray-600 mb-8">{props.eventType.description}</p>
              </div>
              <div className="sm:w-1/2 sm:pl-8 sm:pr-4">
                <form onSubmit={bookingHandler}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium dark:text-white text-gray-700">
                      <T>Your name</T>
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        className="shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="John Doe"
                        defaultValue={props.booking ? props.booking.attendees[0].name : ""}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium dark:text-white text-gray-700">
                      <T>Email address</T>
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        className="shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="you@example.com"
                        defaultValue={props.booking ? props.booking.attendees[0].email : ""}
                      />
                    </div>
                  </div>
                  {locations.length > 1 && (
                    <div className="mb-4">
                      <span className="block text-sm font-medium dark:text-white text-gray-700">
                        <T>Location</T>
                      </span>
                      {locations.map((location) => (
                        <label key={location.type} className="block">
                          <input
                            type="radio"
                            required
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="location focus:ring-black h-4 w-4 text-black border-gray-300 mr-2"
                            name="location"
                            value={location.type}
                            checked={selectedLocation === location.type}
                          />
                          <span className="text-sm ml-2 dark:text-gray-500">
                            <T>{locationLabels[location.type]}</T>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedLocation === LocationType.Phone && (
                    <div className="mb-4">
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium dark:text-white text-gray-700">
                        <T>Phone Number</T>
                      </label>
                      <div className="mt-1">
                        <PhoneInput
                          name="phone"
                          placeholder={intl.formatMessage({
                            id: "enterPhoneNumber",
                            defaultMessage: "Enter phone number",
                            description: "Enter phone number",
                          })}
                          id="phone"
                          required
                          className="shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
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
                              className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                              {input.label}
                            </label>
                          )}
                          {input.type === EventTypeCustomInputType.TEXTLONG && (
                            <textarea
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              rows={3}
                              className="shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder={input.placeholder}
                            />
                          )}
                          {input.type === EventTypeCustomInputType.TEXT && (
                            <input
                              type="text"
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              className="shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder={input.placeholder}
                            />
                          )}
                          {input.type === EventTypeCustomInputType.NUMBER && (
                            <input
                              type="number"
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              className="shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder=""
                            />
                          )}
                          {input.type === EventTypeCustomInputType.BOOL && (
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                name={"custom_" + input.id}
                                id={"custom_" + input.id}
                                className="focus:ring-black h-4 w-4 text-black border-gray-300 rounded mr-2"
                                placeholder=""
                              />
                              <label
                                htmlFor={"custom_" + input.id}
                                className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {input.label}
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                  <div className="mb-4">
                    {!guestToggle && (
                      <label
                        onClick={toggleGuestEmailInput}
                        htmlFor="guests"
                        className="block text-sm font-medium dark:text-white text-blue-500 mb-1 hover:cursor-pointer">
                        + <T>Additional Guests</T>
                      </label>
                    )}
                    {guestToggle && (
                      <div>
                        <label
                          htmlFor="guests"
                          className="block text-sm font-medium dark:text-white text-gray-700 mb-1">
                          <T>Guests</T>
                        </label>
                        <ReactMultiEmail
                          placeholder="guest@example.com"
                          emails={guestEmails}
                          onChange={(_emails: string[]) => {
                            setGuestEmails(_emails);
                          }}
                          getLabel={(email: string, index: number, removeEmail: (index: number) => void) => {
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
                  <div className="mb-4">
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium dark:text-white text-gray-700 mb-1">
                      <T>Additional notes</T>
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      className="shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder={intl.formatMessage({
                        id: "shareAnythingWillHelp",
                        defaultMessage: "Please share anything that will help prepare for our meeting.",
                        description: "Please share anything that will help prepare for our meeting.",
                      })}
                      defaultValue={props.booking ? props.booking.description : ""}
                    />
                  </div>
                  <div className="flex items-start space-x-2">
                    {/* TODO: add styling props to <Button variant="" color="" /> and get rid of btn-primary */}
                    <Button type="submit" loading={loading}>
                      {rescheduleUid ? <T>Reschedule</T> : <T>Confirm</T>}
                    </Button>
                    <Button color="secondary" type="button" onClick={() => router.back()}>
                      <T>Cancel</T>
                    </Button>
                  </div>
                </form>
                {error && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-2">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          {rescheduleUid ? (
                            <T id="couldNotRescheduleMeeting">Could not reschedule the meeting.</T>
                          ) : (
                            <T id="couldNotBookMeeting">Could not book the meeting.</T>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  );
};

export default BookingPage;
