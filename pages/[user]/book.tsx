import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CalendarIcon, ClockIcon, ExclamationIcon, LocationMarkerIcon } from "@heroicons/react/solid";
import prisma, { whereAndSelect } from "../../lib/prisma";
import { EventTypeCustomInputType } from "@prisma/client";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "../../lib/telemetry";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "react-phone-number-input/style.css";
import PhoneInput from "react-phone-number-input";
import { LocationType } from "../../lib/location";
import Avatar from "../../components/Avatar";
import Button from "../../components/ui/Button";
import Theme from "@components/Theme";
import { ReactMultiEmail } from "react-multi-email";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Book(props: any): JSX.Element {
  const router = useRouter();
  const { date, user, rescheduleUid } = router.query;

  const [is24h, setIs24h] = useState(false);
  const [preferredTimeZone, setPreferredTimeZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [guestToggle, setGuestToggle] = useState(false);
  const [guestEmails, setGuestEmails] = useState([]);
  const locations = props.eventType.locations || [];

  const [selectedLocation, setSelectedLocation] = useState<LocationType>(
    locations.length === 1 ? locations[0].type : ""
  );

  const { isReady } = Theme(props.user.theme);
  const telemetry = useTelemetry();

  useEffect(() => {
    setPreferredTimeZone(localStorage.getItem("timeOption.preferredTimeZone") || dayjs.tz.guess());
    setIs24h(!!localStorage.getItem("timeOption.is24hClock"));

    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.timeSelected, collectPageParameters()));
  });

  function toggleGuestEmailInput() {
    setGuestToggle(!guestToggle);
  }

  const locationInfo = (type: LocationType) => locations.find((location) => location.type === type);

  // TODO: Move to translations
  const locationLabels = {
    [LocationType.InPerson]: "In-person meeting",
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
        timeZone: preferredTimeZone,
        eventTypeId: props.eventType.id,
        rescheduleUid: rescheduleUid,
      };

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

      /*const res = await */ fetch("/api/book/" + user, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      // TODO When the endpoint is fixed, change this to await the result again
      //if (res.ok) {
      let successUrl = `/success?date=${date}&type=${props.eventType.id}&user=${
        props.user.username
      }&reschedule=${!!rescheduleUid}&name=${payload.name}`;
      if (payload["location"]) {
        if (payload["location"].includes("integration")) {
          successUrl += "&location=" + encodeURIComponent("Web conferencing details to follow.");
        } else {
          successUrl += "&location=" + encodeURIComponent(payload["location"]);
        }
      }

      await router.push(successUrl);
      /*} else {
                setLoading(false);
                setError(true);
            }*/
    };

    event.preventDefault();
    book();
  };

  return (
    isReady && (
      <div>
        <Head>
          <title>
            {rescheduleUid ? "Reschedule" : "Confirm"} your {props.eventType.title} with{" "}
            {props.user.name || props.user.username} | Calendso
          </title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="mx-auto my-0 max-w-3xl sm:my-24">
          <div className="dark:bg-neutral-900 bg-white border dark:border-0 border-gray-200 overflow-hidden sm:rounded-sm">
            <div className="px-4 py-5 sm:flex sm:p-4">
              <div className="sm:dark:border-black sm:w-1/2 sm:border-r">
                <Avatar user={props.user} className="mb-4 w-16 h-16 rounded-full" />
                <h2 className="dark:text-gray-300 text-gray-500 font-medium">{props.user.name}</h2>
                <h1 className="mb-4 text-gray-800 dark:text-white text-3xl font-semibold">
                  {props.eventType.title}
                </h1>
                <p className="mb-2 text-gray-500">
                  <ClockIcon className="inline-block -mt-1 mr-1 w-4 h-4" />
                  {props.eventType.length} minutes
                </p>
                {selectedLocation === LocationType.InPerson && (
                  <p className="mb-2 text-gray-500">
                    <LocationMarkerIcon className="inline-block -mt-1 mr-1 w-4 h-4" />
                    {locationInfo(selectedLocation).address}
                  </p>
                )}
                <p className="mb-4 text-green-500">
                  <CalendarIcon className="inline-block -mt-1 mr-1 w-4 h-4" />
                  {preferredTimeZone &&
                    dayjs(date)
                      .tz(preferredTimeZone)
                      .format((is24h ? "H:mm" : "h:mma") + ", dddd DD MMMM YYYY")}
                </p>
                <p className="mb-8 text-gray-600 dark:text-white">{props.eventType.description}</p>
              </div>
              <div className="sm:pl-8 sm:pr-4 sm:w-1/2">
                <form onSubmit={bookingHandler}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-gray-700 dark:text-white text-sm font-medium">
                      Your name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        className="block w-full dark:text-white dark:bg-black focus:border-black border-gray-300 dark:border-gray-900 rounded-md shadow-sm focus:ring-black sm:text-sm"
                        placeholder="John Doe"
                        defaultValue={props.booking ? props.booking.attendees[0].name : ""}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="email"
                      className="block text-gray-700 dark:text-white text-sm font-medium">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        className="block w-full dark:text-white dark:bg-black focus:border-black border-gray-300 dark:border-gray-900 rounded-md shadow-sm focus:ring-black sm:text-sm"
                        placeholder="you@example.com"
                        defaultValue={props.booking ? props.booking.attendees[0].email : ""}
                      />
                    </div>
                  </div>
                  {locations.length > 1 && (
                    <div className="mb-4">
                      <span className="block text-gray-700 dark:text-white text-sm font-medium">
                        Location
                      </span>
                      {locations.map((location) => (
                        <label key={location.type} className="block">
                          <input
                            type="radio"
                            required
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="location"
                            name="location"
                            value={location.type}
                            checked={selectedLocation === location.type}
                          />
                          <span className="ml-2 dark:text-gray-500 text-sm">
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
                        className="block text-gray-700 dark:text-white text-sm font-medium">
                        Phone Number
                      </label>
                      <div className="mt-1">
                        <PhoneInput
                          name="phone"
                          placeholder="Enter phone number"
                          id="phone"
                          required
                          className="block w-full dark:text-white dark:bg-black focus:border-black border-gray-300 dark:border-gray-900 rounded-md shadow-sm focus:ring-black sm:text-sm"
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
                              htmlFor={input.label}
                              className="block mb-1 text-gray-700 dark:text-white text-sm font-medium">
                              {input.label}
                            </label>
                          )}
                          {input.type === EventTypeCustomInputType.TEXTLONG && (
                            <textarea
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              rows={3}
                              className="block w-full dark:text-white dark:bg-black focus:border-black border-gray-300 dark:border-gray-900 rounded-md shadow-sm focus:ring-black sm:text-sm"
                              placeholder=""
                            />
                          )}
                          {input.type === EventTypeCustomInputType.TEXT && (
                            <input
                              type="text"
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              className="block w-full dark:text-white dark:bg-black focus:border-black border-gray-300 dark:border-gray-900 rounded-md shadow-sm focus:ring-black sm:text-sm"
                              placeholder=""
                            />
                          )}
                          {input.type === EventTypeCustomInputType.NUMBER && (
                            <input
                              type="number"
                              name={"custom_" + input.id}
                              id={"custom_" + input.id}
                              required={input.required}
                              className="block w-full dark:text-white dark:bg-black focus:border-black border-gray-300 dark:border-gray-900 rounded-md shadow-sm focus:ring-black sm:text-sm"
                              placeholder=""
                            />
                          )}
                          {input.type === EventTypeCustomInputType.BOOL && (
                            <div className="flex items-center h-5">
                              <input
                                type="checkbox"
                                name={"custom_" + input.id}
                                id={"custom_" + input.id}
                                className="mr-2 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                                placeholder=""
                              />
                              <label
                                htmlFor={input.label}
                                className="block text-gray-700 text-sm font-medium">
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
                        className="block mb-1 text-blue-500 dark:text-white text-sm font-medium hover:cursor-pointer">
                        + Additional Guests
                      </label>
                    )}
                    {guestToggle && (
                      <div>
                        <label
                          htmlFor="guests"
                          className="block mb-1 text-gray-700 dark:text-white text-sm font-medium">
                          Guests
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
                      className="block mb-1 text-gray-700 dark:text-white text-sm font-medium">
                      Additional notes
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      className="block w-full dark:text-white dark:bg-black focus:border-black border-gray-300 dark:border-gray-900 rounded-md shadow-sm focus:ring-black sm:text-sm"
                      placeholder="Please share anything that will help prepare for our meeting."
                      defaultValue={props.booking ? props.booking.description : ""}
                    />
                  </div>
                  <div className="flex items-start">
                    {/* TODO: add styling props to <Button variant="" color="" /> and get rid of btn-primary */}
                    <Button type="submit" loading={loading}>
                      {rescheduleUid ? "Reschedule" : "Confirm"}
                    </Button>
                    <Link
                      href={
                        "/" +
                        props.user.username +
                        "/" +
                        props.eventType.slug +
                        (rescheduleUid ? "?rescheduleUid=" + rescheduleUid : "")
                      }>
                      <a className="ml-2 p-2 dark:text-white text-sm">Cancel</a>
                    </Link>
                  </div>
                </form>
                {error && (
                  <div className="mt-2 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationIcon className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <p className="text-yellow-700 text-sm">
                          Could not {rescheduleUid ? "reschedule" : "book"} the meeting. Please try again or{" "}
                          <a
                            href={"mailto:" + props.user.email}
                            className="hover:text-yellow-600 text-yellow-700 underline font-medium">
                            Contact {props.user.name} via e-mail
                          </a>
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
}

export async function getServerSideProps(context) {
  const user = await whereAndSelect(
    prisma.user.findFirst,
    {
      username: context.query.user,
    },
    ["username", "name", "email", "bio", "avatar", "theme"]
  );

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: parseInt(context.query.type),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      locations: true,
      customInputs: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
    },
  });

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  let booking = null;

  if (context.query.rescheduleUid) {
    booking = await prisma.booking.findFirst({
      where: {
        uid: context.query.rescheduleUid,
      },
      select: {
        description: true,
        attendees: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  }

  return {
    props: {
      user,
      eventType: eventTypeObject,
      booking,
    },
  };
}
