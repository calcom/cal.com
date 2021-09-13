import { CalendarIcon, XIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { HeadSeo } from "@components/seo/head-seo";
import { useRouter } from "next/router";
import { useState } from "react";
import { Button } from "@components/ui/Button";
import prisma from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";

dayjs.extend(utc);

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
      method: "DELETE",
    });

    if (res.status >= 200 && res.status < 300) {
      await router.push(
        `/cancel/success?name=${props.profile.name}&title=${props.booking.title}&eventPage=${
          props.profile.slug
        }&team=${props.booking.eventType.team ? 1 : 0}`
      );
    } else {
      setLoading(false);
      setError("An error with status code " + res.status + " occurred. Please try again later.");
    }
  };

  return (
    <div>
      <HeadSeo
        title={`Cancel ${props.booking && props.booking.title} | ${props.profile.name}`}
        description={`Cancel ${props.booking && props.booking.title} | ${props.profile.name}`}
      />
      <main className="max-w-3xl mx-auto my-24">
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 sm:my-0 transition-opacity" aria-hidden="true">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                {error && (
                  <div>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <XIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-5">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {error}
                      </h3>
                    </div>
                  </div>
                )}
                {!error && (
                  <>
                    <div>
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <XIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-5">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                          Really cancel your booking?
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">Instead, you could also reschedule it.</p>
                        </div>
                        <div className="mt-4 border-t border-b py-4">
                          <h2 className="text-lg font-medium text-gray-600 mb-2">{props.booking.title}</h2>
                          <p className="text-gray-500">
                            <CalendarIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                            {dayjs(props.booking.startTime).format(
                              (is24h ? "H:mm" : "h:mma") + ", dddd DD MMMM YYYY"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 sm:mt-6 text-center space-x-2">
                      <Button
                        color="secondary"
                        data-testid="cancel"
                        onClick={cancellationHandler}
                        loading={loading}>
                        Cancel
                      </Button>
                      <Button onClick={() => router.push("/reschedule/" + uid)}>Reschedule</Button>
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
  const booking = await prisma.booking.findUnique({
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
      user: {
        select: {
          username: true,
          name: true,
        },
      },
      eventType: {
        select: {
          team: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    // TODO: Booking is already cancelled
    return {
      props: { booking: null },
    };
  }

  const bookingObj = Object.assign({}, booking, {
    startTime: booking.startTime.toString(),
    endTime: booking.endTime.toString(),
  });

  const profile = booking.eventType.team
    ? {
        name: booking.eventType.team.name,
        slug: booking.eventType.team.slug,
      }
    : booking.user;

  return {
    props: {
      profile,
      booking: bookingObj,
    },
  };
}
