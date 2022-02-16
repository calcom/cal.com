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
import { TextField } from "@components/form/fields";
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
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const telemetry = useTelemetry();

  return (
    <div>
      <HeadSeo
        title={`${t("cancel")} ${props.booking && props.booking.title} | ${props.profile?.name}`}
        description={`${t("cancel")} ${props.booking && props.booking.title} | ${props.profile?.name}`}
      />
      <CustomBranding val={props.profile?.brandColor} />
      <main className="mx-auto my-24 max-w-3xl">
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 sm:align-middle"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                {error && (
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                      <XIcon className="h-6 w-6 text-red-600" />
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
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <XIcon className="h-6 w-6 text-red-600" />
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
                        <div className="mt-4 border-t border-b py-4">
                          <h2 className="font-cal mb-2 text-lg font-medium text-gray-600">
                            {props.booking?.title}
                          </h2>
                          <p className="text-gray-500">
                            <CalendarIcon className="mr-1 -mt-1 inline-block h-4 w-4" />
                            {dayjs(props.booking?.startTime).format(
                              (is24h ? "H:mm" : "h:mma") + ", dddd DD MMMM YYYY"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    {props.cancellationAllowed && (
                      <div className="mt-5 sm:mt-6">
                        <TextField
                          name={t("cancellation_reason")}
                          placeholder={t("cancellation_reason_placeholder")}
                          value={cancellationReason}
                          onChange={(e) => setCancellationReason(e.target.value)}
                          className="mb-5 sm:mb-6"
                        />
                        <div className="space-x-2 text-center rtl:space-x-reverse">
                          <Button
                            color="secondary"
                            data-testid="cancel"
                            onClick={async () => {
                              setLoading(true);

                              const payload = {
                                uid: uid,
                                reason: cancellationReason,
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
