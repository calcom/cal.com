import { HeadSeo } from "@components/seo/head-seo";
import { CalendarIcon, XIcon } from "@heroicons/react/solid";
import prisma from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

export default function Type(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  // Get router variables
  const router = useRouter();
  const { uid, from } = router.query;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [is24h, setIs24h] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(props.booking ? null : "This booking was already cancelled");
  const telemetry = useTelemetry();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cancellationHandler = async () => {
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
      const successURL = "/cancel/success";
      const urlParams = [];
      if (props.user?.username) urlParams.push("user=" + props.user.username);
      if (props.user?.title) urlParams.push("title=" + props.user.title);
      if (from) urlParams.push("from=" + from);
      router.push(`${successURL}?${urlParams.join("&")}`);
    } else {
      setLoading(false);
      setError("An error with status code " + res.status + " occurred. Please try again later.");
    }
  };

  return (
    <div>
      <HeadSeo
        title={`Cancel ${props.booking && props.booking.title} | ${props.user.name || props.user.username}`}
        description={`Cancel ${props.booking && props.booking.title} | ${
          props.user.name || props.user.username
        }`}
      />
      <main className="max-w-3xl mx-auto my-24">
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                {error && (
                  <div>
                    <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                      <XIcon className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                        {error}
                      </h3>
                    </div>
                  </div>
                )}
                {!error && (
                  <>
                    <div>
                      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                        <XIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-5">
                        <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-headline">
                          Really cancel your booking?
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">Instead, you could also reschedule it.</p>
                        </div>
                        <div className="py-4 mt-4 border-t border-b">
                          <h2 className="mb-2 text-lg font-medium text-gray-600">{props.booking?.title}</h2>
                          <p className="text-gray-500">
                            <CalendarIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                            {dayjs
                              .utc(props.booking?.startTime)
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
                          className="inline-flex items-center justify-center px-4 py-2 mx-2 font-medium text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm btn-white">
                          Cancel
                        </button>
                        <button
                          onClick={() => router.push("/reschedule/" + uid)}
                          disabled={loading}
                          type="button"
                          className="inline-flex items-center justify-center px-4 py-2 mx-2 font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:text-sm btn-white">
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

export const getServerSideProps: GetServerSideProps = async (context) => {
  const booking = await prisma.booking.findFirst({
    where: {
      uid: context.query.uid as string,
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
};
