import { CalendarIcon, XIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import prisma from "../../lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "../../lib/telemetry";

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

export default function Type(props) {
  // Get router variables
  const router = useRouter();
  const { uid } = router.query;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [is24h, setIs24h] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(props.booking ? null : "This booking was already cancelled");
  const telemetry = useTelemetry();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cancellationHandler = async (event) => {
    setLoading(true);

    const payload = {
      uid: uid,
    };

    telemetry.withJitsu((jitsu) =>
      jitsu.track(telemetryEventTypes.bookingCancelled, collectPageParameters())
    );
    const res = await fetch("/api/cancel", {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (res.status >= 200 && res.status < 300) {
      router.push("/cancel/success?user=" + props.user.username + "&title=" + props.booking.title);
    } else {
      setLoading(false);
      setError("An error with status code " + res.status + " occurred. Please try again later.");
    }
  };

  return (
    <div>
      <Head>
        <title>
          Cancel {props.booking && `${props.booking.title} | ${props.user.name || props.user.username} `}|
          Calendso
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="mx-auto my-24 max-w-3xl">
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center pb-20 pt-4 px-4 min-h-screen text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block align-bottom pb-4 pt-5 px-4 text-left bg-white rounded-lg shadow-xl overflow-hidden transform transition-all sm:align-middle sm:my-8 sm:p-6 sm:w-full sm:max-w-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                {error && (
                  <div>
                    <div className="flex items-center justify-center mx-auto w-12 h-12 bg-red-100 rounded-full">
                      <XIcon className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <h3 className="text-gray-900 text-lg font-medium leading-6" id="modal-title">
                        {error}
                      </h3>
                    </div>
                  </div>
                )}
                {!error && (
                  <>
                    <div>
                      <div className="flex items-center justify-center mx-auto w-12 h-12 bg-red-100 rounded-full">
                        <XIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-5">
                        <h3 className="text-gray-900 text-lg font-medium leading-6" id="modal-headline">
                          Really cancel your booking?
                        </h3>
                        <div className="mt-2">
                          <p className="text-gray-500 text-sm">Instead, you could also reschedule it.</p>
                        </div>
                        <div className="mt-4 py-4 border-b border-t">
                          <h2 className="mb-2 text-gray-600 text-lg font-medium">{props.booking.title}</h2>
                          <p className="text-gray-500">
                            <CalendarIcon className="inline-block -mt-1 mr-1 w-4 h-4" />
                            {dayjs
                              .utc(props.booking.startTime)
                              .format((is24h ? "H:mm" : "h:mma") + ", dddd DD MMMM YYYY")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 text-center sm:mt-6">
                      <div className="mt-5">
                        <button
                          onClick={cancellationHandler}
                          disabled={loading}
                          type="button"
                          className="btn-white inline-flex items-center justify-center mx-2 px-4 py-2 text-red-700 font-medium bg-red-100 hover:bg-red-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:text-sm">
                          Cancel
                        </button>
                        <button
                          onClick={() => router.push("/reschedule/" + uid)}
                          disabled={loading}
                          type="button"
                          className="btn-white inline-flex items-center justify-center mx-2 px-4 py-2 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:text-sm">
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const booking = await prisma.booking.findFirst({
    where: {
      uid: context.query.uid,
    },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      attendees: true,
      eventType: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  });

  if (!booking) {
    return {
      props: { booking: null },
    };
  }

  // Workaround since Next.js has problems serializing date objects (see https://github.com/vercel/next.js/issues/11993)
  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  return {
    props: {
      user: booking.user,
      eventType: booking.eventType,
      booking: bookingObj,
    },
  };
}
