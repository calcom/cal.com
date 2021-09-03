import Avatar from "@components/Avatar";
import CustomCardElement from "@components/booking/CustomCardElement";
import { HeadSeo } from "@components/seo/head-seo";
import Theme from "@components/Theme";
import { Button } from "@components/ui/Button";
import PhoneInput from "@components/ui/form/PhoneInput";
import {
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationIcon,
  LocationMarkerIcon,
} from "@heroicons/react/solid";
import formatCurrency from "@lib/formatCurrency";
import { EventTypeLocation, LocationType } from "@lib/location";
import prisma from "@lib/prisma";
import serverSideErrorHandler from "@lib/serverSideErrorHandler";
import { createPaymentIntent } from "@lib/stripe/client";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { EventTypeCustomInputType } from "@prisma/client";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ReactMultiEmail } from "react-multi-email";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Book(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const { date, user, rescheduleUid } = router.query;

  const [is24h, setIs24h] = useState(false);
  const [preferredTimeZone, setPreferredTimeZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [guestToggle, setGuestToggle] = useState(false);
  const [guestEmails, setGuestEmails] = useState([]);
  const [isCardComplete, setCardComplete] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const locations = (props.eventType.locations as EventTypeLocation[]) || [];

  const [selectedLocation, setSelectedLocation] = useState<`${LocationType}` | "">(
    locations.length === 1 ? locations[0].type : ""
  );

  const { isReady } = Theme(props.user.theme || undefined);
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

  const bookingHandler: React.FormEventHandler<HTMLFormElement> = (event) => {
    if (!event.currentTarget.reportValidity()) return;

    const book = async () => {
      setLoading(true);
      setError(false);
      /* Attempt payment if applicable */
      if (props.eventType.price) {
        if (!isCardComplete) {
          setLoading(false);
          setError(true);
          return;
        }
        const response = await createPaymentIntent({
          eventTypeId: props.eventType.id,
          username: props.user.username as string,
        });
        const cardElement = elements!.getElement(CardElement);
        const { error } = await stripe!.confirmCardPayment(response.client_secret, {
          payment_method: {
            card: cardElement!,
            billing_details: {
              name: event.target.name.value,
              email: event.target.email.value,
            },
          },
        });
        if (error) {
          setLoading(false);
          setError(true);
          return;
        }
      }
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
        <HeadSeo
          title={`${rescheduleUid ? "Reschedule" : "Confirm"} your ${props.eventType.title} with ${
            props.user.name || props.user.username
          }`}
          description={`${rescheduleUid ? "Reschedule" : "Confirm"} your ${props.eventType.title} with ${
            props.user.name || props.user.username
          }`}
        />

        <main className="max-w-3xl mx-auto my-0 sm:my-24">
          <div className="overflow-hidden bg-white border border-gray-200 dark:bg-neutral-900 dark:border-0 sm:rounded-sm">
            <div className="px-4 py-5 sm:flex sm:p-4">
              <div className="sm:w-1/2 sm:border-r sm:dark:border-black">
                <Avatar
                  displayName={props.user.name}
                  imageSrc={props.user.avatar}
                  className="w-16 h-16 mb-4 rounded-full"
                />
                <h2 className="font-medium text-gray-500 dark:text-gray-300">{props.user.name}</h2>
                <h1 className="mb-4 text-3xl font-semibold text-gray-800 dark:text-white">
                  {props.eventType.title}
                </h1>
                <p className="mb-2 text-gray-500">
                  <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                  {props.eventType.length} minutes
                </p>

                {props.eventType.price && (
                  <p className="mb-2 text-gray-500">
                    <CurrencyDollarIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                    {formatCurrency(props.eventType.price)}
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
                  {preferredTimeZone &&
                    dayjs(date)
                      .tz(preferredTimeZone)
                      .format((is24h ? "H:mm" : "h:mma") + ", dddd DD MMMM YYYY")}
                </p>
                <p className="mb-8 text-gray-600 dark:text-white">{props.eventType.description}</p>
              </div>
              <div className="sm:w-1/2 sm:pl-8 sm:pr-4">
                <form onSubmit={bookingHandler}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white">
                      Your name
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
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="email"
                        id="email"
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
                        Location
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
                        Phone number
                      </label>
                      <div className="mt-1">
                        <PhoneInput name="phone" placeholder="Enter phone number" id="phone" required />
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
                  <div className="mb-4">
                    {!guestToggle && (
                      <label
                        onClick={toggleGuestEmailInput}
                        htmlFor="guests"
                        className="block mb-1 text-sm font-medium text-blue-500 dark:text-white hover:cursor-pointer">
                        + Additional Guests
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
                      className="block mb-1 text-sm font-medium text-gray-700 dark:text-white">
                      Additional notes
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      className="block w-full border-gray-300 rounded-md shadow-sm dark:bg-black dark:text-white dark:border-gray-900 focus:ring-black focus:border-black sm:text-sm"
                      placeholder="Please share anything that will help prepare for our meeting."
                      defaultValue={props.booking ? props.booking.description : ""}
                    />
                  </div>
                  {props.eventType.price && (
                    <div className="mb-4">
                      <label
                        htmlFor="notes"
                        className="block mb-1 text-sm font-medium text-gray-700 dark:text-white">
                        Payment details
                      </label>
                      <div className="mt-1">
                        <CustomCardElement
                          onChange={(e) => {
                            console.log(`e`, e);
                            if (e.error) {
                              console.log(`e.error`, e.error);
                            }
                            setCardComplete(e.complete);
                          }}
                        />
                        {/* We prevent form submision if card isn't complete */}
                        <input
                          type="text"
                          tabIndex={-1}
                          name="is_card_complete"
                          id="is_card_complete"
                          value={isCardComplete ? "true" : ""}
                          required
                          className="sr-only"
                        />
                      </div>
                    </div>
                  )}
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
                      <a className="p-2 ml-2 text-sm dark:text-white">Cancel</a>
                    </Link>
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
                          Could not {rescheduleUid ? "reschedule" : "book"} the meeting. Please try again or{" "}
                          <a
                            href={"mailto:" + props.user.email}
                            className="font-medium text-yellow-700 underline hover:text-yellow-600">
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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        username: (context.query.user as string).toLowerCase(),
      },
      select: {
        username: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        theme: true,
      },
    });

    if (!user) throw "notFound";

    const eventType = await prisma.eventType.findUnique({
      where: {
        id: parseInt(context.query.type as string),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        length: true,
        price: true,
        locations: true,
        customInputs: true,
        periodType: true,
        periodDays: true,
        periodStartDate: true,
        periodEndDate: true,
        periodCountCalendarDays: true,
      },
    });

    if (!eventType) throw "notFound";

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
          uid: context.query.rescheduleUid as string,
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
  } catch (error) {
    return serverSideErrorHandler(error);
  }
}
