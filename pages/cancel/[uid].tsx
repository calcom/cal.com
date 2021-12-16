import { CalendarIcon, XIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

import { asStringOrUndefined } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import CustomBranding from "@components/CustomBranding";
import { HeadSeo } from "@components/seo/head-seo";
import { Button } from "@components/ui/Button";

import { ssrInit } from "@server/lib/ssr";

export default function Type(props: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  // Get router variables
  const router = useRouter();
  const { uid } = router.query;
  const [is24h] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(props.booking ? null : t("booking_already_cancelled"));
  const telemetry = useTelemetry();

  return (
    <div>
      <HeadSeo
        title={`${t("cancel")} ${props.booking && props.booking.title} | ${props.profile?.name}`}
        description={`${t("cancel")} ${props.booking && props.booking.title} | ${props.profile?.name}`}
      />
      <CustomBranding val={props.profile?.brandColor} />
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
                          {props.cancellationAllowed
                            ? t("really_cancel_booking")
                            : t("cannot_cancel_booking")}
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            {props.cancellationAllowed ? t("reschedule_instead") : t("event_is_in_the_past")}
                          </p>
                        </div>
                        <div className="py-4 mt-4 border-t border-b">
                          <h2 className="mb-2 text-lg font-medium text-gray-600 font-cal">
                            {props.booking?.title}
                          </h2>
                          <p className="text-gray-500">
                            <CalendarIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                            {dayjs(props.booking?.startTime).format(
                              (is24h ? "H:mm" : "h:mma") + ", dddd DD MMMM YYYY"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    {props.cancellationAllowed && (
                      <div className="mt-5 space-x-2 text-center sm:mt-6">
                        <Button
                          color="secondary"
                          data-testid="cancel"
                          onClick={async () => {
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
                                `/cancel/success?name=${props.profile.name}&title=${
                                  props.booking.title
                                }&eventPage=${props.profile.slug}&team=${
                                  props.booking.eventType?.team ? 1 : 0
                                }`
                              );
                            } else {
                              setLoading(false);
                              setError(
                                `${t("error_with_status_code_occured", { status: res.status })} ${t(
                                  "please_try_again"
                                )}`
                              );
                            }
                          }}
                          loading={loading}>
                          {t("cancel")}
                        </Button>
                        <Button onClick={() => router.push("/reschedule/" + uid)}>{t("reschedule")}</Button>
                      </div>
                    )}
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const session = await getSession(context);
  const booking = await prisma.booking.findUnique({
    where: {
      uid: asStringOrUndefined(context.query.uid),
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
          id: true,
          username: true,
          name: true,
          brandColor: true,
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

  const profile = {
    name: booking.eventType?.team?.name || booking.user?.name || null,
    slug: booking.eventType?.team?.slug || booking.user?.username || null,
    brandColor: booking.user?.brandColor || null,
  };

  return {
    props: {
      profile,
      booking: bookingObj,
      cancellationAllowed:
        (!!session?.user && session.user?.id === booking.user?.id) || booking.startTime >= new Date(),
      trpcState: ssr.dehydrate(),
    },
  };
};
