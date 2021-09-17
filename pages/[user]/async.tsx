import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ExclamationIcon } from "@heroicons/react/solid";
import prisma from "../../lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "../../lib/telemetry";
import { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "react-phone-number-input/style.css";
import Avatar from "../../components/Avatar";
import Button from "../../components/ui/Button";
import Theme from "@components/Theme";
import { ReactMultiEmail } from "react-multi-email";
import { InferGetServerSidePropsType } from "next";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Book(props: InferGetServerSidePropsType<typeof getServerSideProps>): JSX.Element {
  const router = useRouter();
  const { user } = router.query;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [guestToggle, setGuestToggle] = useState(false);
  const [guestEmails, setGuestEmails] = useState([]);

  const { isReady } = Theme(props.user.theme);
  const telemetry = useTelemetry();

  function toggleGuestEmailInput() {
    setGuestToggle(!guestToggle);
  }

  const bookingHandler = (event) => {
    const book = async () => {
      setLoading(true);
      setError(false);
      let notes = "";
      if (!!notes && !!event.target.notes.value) {
        notes += "\n\nMeeting context:\n" + event.target.notes.value;
      } else {
        notes += event.target.notes.value;
      }

      const payload = {
        name: event.target.name.value,
        topic: event.target.topic.value,
        email: event.target.email.value,
        notes: notes,
        guests: guestEmails,
      };

      telemetry.withJitsu((jitsu) =>
        jitsu.track(telemetryEventTypes.bookingConfirmed, collectPageParameters())
      );

      const res = await fetch("/api/book/" + user + "/async", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const { bookingId } = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(true);
      }

      const successUrl = `/success/async?bookingId=${bookingId}`;

      await router.push(successUrl);
    };

    event.preventDefault();

    book();
  };

  return (
    isReady && (
      <div>
        <Head>
          <title>Confirm your Async Meeting with {props.user.name || props.user.username} | Calendso</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-3xl mx-auto my-0 sm:my-24">
          <div className="overflow-hidden bg-white border border-gray-200 sm:rounded-sm">
            <div className="px-4 py-5 sm:flex sm:p-4">
              <div className="sm:w-1/2 sm:border-r sm:">
                <Avatar user={props.user} className="w-16 h-16 mb-4 rounded-full" />
                <h2 className="font-medium text-gray-500 ">{props.user.name}</h2>
                <h1 className="mb-4 text-3xl font-semibold text-gray-800 ">Async Meeting</h1>

                <p className="mb-8 text-gray-600 ">
                  Async meeting with {props.user.name || props.user.username}.
                </p>
              </div>
              <div className="sm:w-1/2 sm:pl-8 sm:pr-4">
                <form onSubmit={bookingHandler}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 ">
                      Meeting topic
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="topic"
                        id="topic"
                        required
                        className="block w-full text-gray-900 placeholder-gray-600 bg-gray-300 border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                        placeholder="Meeting topic"
                        defaultValue={""}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 ">
                      Your name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        className="block w-full text-gray-900 placeholder-gray-600 bg-gray-300 border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                        placeholder="John Doe"
                        defaultValue={props.booking ? props.booking.attendees[0].name : ""}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 ">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="email"
                        id="email"
                        required
                        className="block w-full text-gray-900 placeholder-gray-600 bg-gray-300 border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                        placeholder="you@example.com"
                        defaultValue={props.booking ? props.booking.attendees[0].email : ""}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    {!guestToggle && (
                      <label
                        onClick={toggleGuestEmailInput}
                        htmlFor="guests"
                        className="block mb-1 text-sm font-medium text-black hover:cursor-pointer">
                        + Additional Guests
                      </label>
                    )}
                    {guestToggle && (
                      <div>
                        <label htmlFor="guests" className="block mb-1 text-sm font-medium text-gray-700 ">
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
                    <label htmlFor="notes" className="block mb-1 text-sm font-medium text-gray-700 ">
                      Meeting context
                    </label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      className="block w-full text-gray-900 placeholder-gray-600 bg-gray-300 border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
                      placeholder="Please share anything that will help prepare for our meeting."
                      defaultValue={props.booking ? props.booking.description : ""}
                    />
                  </div>
                  <div className="flex items-start">
                    {/* TODO: add styling props to <Button variant="" color="" /> and get rid of btn-primary */}
                    <Button type="submit" loading={loading}>
                      Confirm
                    </Button>
                    <Link href={"/" + props.user.username}>
                      <a className="p-2 ml-2 text-sm text-neutral-900">Cancel</a>
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
                          Could not create the meeting. Please try again or{" "}
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

export async function getServerSideProps(context) {
  const userParam = context.query.user as string;

  const user = await prisma.user.findFirst({
    where: {
      username: userParam.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      startTime: true,
      endTime: true,
      timeZone: true,
      weekStart: true,
      availability: true,
      hideBranding: true,
      theme: true,
    },
  });
  if (!user) {
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {
      user,
    },
  };
}
