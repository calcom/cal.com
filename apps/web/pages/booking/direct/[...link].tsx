import { BookingStatus } from "@prisma/client";
import base64url from "base64url";
import { createHmac } from "crypto";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import z from "zod";

import { getEventLocationValue, getSuccessPageLocationMessage } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { getRecurringWhen } from "@calcom/emails/src/components/WhenInfo";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { processBookingConfirmation } from "@calcom/lib/server/queries/bookings/confirm";
import prisma from "@calcom/prisma";
import { TRPCError } from "@calcom/trpc/server";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, Icon, TextArea } from "@calcom/ui";

import { HeadSeo } from "@components/seo/head-seo";

enum DirectAction {
  "accept" = "accept",
  "reject" = "reject",
}
const actionSchema = z.nativeEnum(DirectAction);

const refineParse = (result: z.SafeParseReturnType<any, any>, context: z.RefinementCtx) => {
  if (result.success === false) {
    result.error.issues.map((issue) => context.addIssue(issue));
  }
};

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

const pageErrors = {
  signature_mismatch: "Direct link signature doesn't match signed data",
  booking_not_found: "Direct link booking not found",
  user_not_found: "Direct link booking user not found",
};

const requestSchema = z.object({
  link: z
    .array(z.string())
    .max(4)
    .superRefine((data, ctx) => {
      refineParse(actionSchema.safeParse(data[0]), ctx);
      const signedData = `${data[1]}/${data[2]}`;
      const sha1 = createHmac("sha1", CALENDSO_ENCRYPTION_KEY).update(signedData).digest();
      const sig = base64url(sha1);
      if (data[3] !== sig) {
        ctx.addIssue({
          message: pageErrors.signature_mismatch,
          code: "custom",
        });
      }
    }),
  reason: z.string().optional(),
});

function bookingContent(status: BookingStatus | undefined | null) {
  switch (status) {
    case BookingStatus.PENDING:
      // Trying to reject booking without reason
      return {
        iconColor: "gray",
        Icon: Icon.FiCalendar,
        titleKey: "event_awaiting_approval",
        subtitleKey: "someone_requested_an_event",
      };
    case BookingStatus.ACCEPTED:
      // Booking was acepted successfully
      return {
        iconColor: "green",
        Icon: Icon.FiCheck,
        titleKey: "booking_confirmed",
        subtitleKey: "emailed_you_and_any_other_attendees",
      };
    case BookingStatus.REJECTED:
      // Booking was rejected successfully
      return {
        iconColor: "red",
        Icon: Icon.FiX,
        titleKey: "booking_rejection_success",
        subtitleKey: "emailed_you_and_any_other_attendees",
      };
    default:
      // Booking was already accepted or rejected
      return {
        iconColor: "yellow",
        Icon: Icon.FiAlertTriangle,
        titleKey: "booking_already_accepted_rejected",
      };
  }
}

export default function Directlink({ booking, reason, status }: inferSSRProps<typeof getServerSideProps>) {
  const { t } = useLocale();
  const router = useRouter();
  const acceptPath = router.asPath.replace("reject", "accept");
  const rejectPath = router.asPath.replace("accept", "reject");
  const [cancellationReason, setCancellationReason] = useState("");
  function getRecipientStart(format: string) {
    return dayjs(booking.startTime).tz(booking?.user?.timeZone).format(format);
  }

  function getRecipientEnd(format: string) {
    return dayjs(booking.endTime).tz(booking?.user?.timeZone).format(format);
  }
  const organizer = {
    ...booking.attendees[0],
    language: {
      translate: t,
      locale: booking.attendees[0].locale ?? "en",
    },
  };
  const location: ReturnType<typeof getEventLocationValue> = Array.isArray(booking.location)
    ? booking.location[0]
    : // If there is no location set then we default to Cal Video
      "integrations:daily";
  const locationToDisplay = getSuccessPageLocationMessage(location, t);
  const content = bookingContent(status);
  const recurringInfo = getRecurringWhen({
    recurringEvent: booking.eventType?.recurringEvent,
    attendee: organizer,
  });
  return (
    <>
      <HeadSeo
        title={t(content.titleKey)}
        description=""
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div className="dark:bg-darkgray-50 desktop-transparent min-h-screen bg-gray-100 px-4">
        <main className="mx-auto max-w-3xl">
          <div className="z-50 overflow-y-auto ">
            <div className="flex items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
                <div
                  className="main dark:bg-darkgray-100 inline-block transform overflow-hidden rounded-lg border bg-white px-8 pt-5 pb-4 text-left align-bottom transition-all dark:border-neutral-700 sm:my-[68px] sm:w-full sm:max-w-xl sm:py-8 sm:align-middle"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="modal-headline">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full sm:mx-auto bg-${content.iconColor}-100`}>
                    <content.Icon className={`h-5 w-5 text-${content.iconColor}-600`} />
                  </div>
                  <div className="mt-6 mb-8 last:mb-0 sm:text-center">
                    <h3
                      className="text-2xl font-semibold leading-6 text-neutral-900 dark:text-white"
                      id="modal-headline">
                      {t(content.titleKey)}
                    </h3>
                    {content.subtitleKey && (
                      <div className="mt-3">
                        <p className="text-neutral-600 dark:text-gray-300">{t(content.subtitleKey)}</p>
                      </div>
                    )}
                    <div className="dark:border-darkgray-300 mt-8 grid grid-cols-3 border-t border-[#e1e1e1] pt-8 text-left text-[#313131] dark:text-gray-300">
                      <div className="col-span-3 font-medium sm:col-span-1">{t("what")}</div>
                      <div className="col-span-3 mb-6 last:mb-0 sm:col-span-2">{booking.title}</div>
                      <div className="col-span-3 font-medium sm:col-span-1">{t("when")}</div>
                      <div className="col-span-3 mb-6 last:mb-0 sm:col-span-2">
                        {recurringInfo !== "" && (
                          <>
                            {recurringInfo}
                            <br />
                          </>
                        )}
                        {booking.eventType.recurringEvent?.count ? `${t("starting")} ` : ""}
                        {t(getRecipientStart("dddd").toLowerCase())},{" "}
                        {t(getRecipientStart("MMMM").toLowerCase())} {getRecipientStart("D, YYYY")}
                        <br />
                        {getRecipientStart("h:mma")} - {getRecipientEnd("h:mma")}{" "}
                        <span style={{ color: "#888888" }}>({booking?.user?.timeZone})</span>
                      </div>
                      {(booking?.user || booking?.attendees) && (
                        <>
                          <div className="col-span-3 font-medium sm:col-span-1">{t("who")}</div>
                          <div className="col-span-3 last:mb-0 sm:col-span-2">
                            <>
                              {booking?.user && (
                                <div className="mb-3">
                                  <p>{booking.user.name}</p>
                                  <p className="text-[#888888]">{booking.user.email}</p>
                                </div>
                              )}
                              {booking?.attendees.map((attendee) => (
                                <div key={attendee.name} className="mb-3 last:mb-0">
                                  {attendee.name && <p>{attendee.name}</p>}
                                  <p className="text-[#888888]">{attendee.email}</p>
                                </div>
                              ))}
                            </>
                          </div>
                        </>
                      )}
                      {locationToDisplay && (
                        <>
                          <div className="col-span-3 mt-6 font-medium sm:col-span-1">{t("where")}</div>
                          <div className="col-span-3 mt-6 sm:col-span-2">
                            {locationToDisplay.startsWith("http") ? (
                              <a title="Meeting Link" href={locationToDisplay}>
                                {locationToDisplay}
                              </a>
                            ) : (
                              locationToDisplay
                            )}
                          </div>
                        </>
                      )}
                      {booking?.description && (
                        <>
                          <div className="col-span-3 mt-9 font-medium sm:col-span-1">
                            {t("additional_notes")}
                          </div>
                          <div className="col-span-3 mb-2 mt-9 sm:col-span-2">
                            <p>{booking.description}</p>
                          </div>
                        </>
                      )}
                      {status === BookingStatus.REJECTED && reason && (
                        <>
                          <div className="col-span-3 mt-9 font-medium sm:col-span-1">
                            {t("rejection_reason")}
                          </div>
                          <div className="col-span-3 mb-2 mt-9 sm:col-span-2">
                            <p>{reason}</p>
                          </div>
                        </>
                      )}
                    </div>
                    {status === BookingStatus.PENDING && reason === undefined && (
                      <>
                        <hr className="mt-6" />
                        <div className="mt-5 text-left sm:mt-6">
                          <label className="font-medium text-[#313131] dark:text-white">
                            {`${t("rejection_reason")} (${t("optional").toLowerCase()})`}
                          </label>
                          <TextArea
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            className="mt-2 mb-4 w-full dark:border-gray-900 dark:bg-gray-700 dark:text-white "
                            rows={3}
                          />
                          <div className="flex flex-col-reverse rtl:space-x-reverse">
                            <div className="ml-auto flex w-full justify-end space-x-4">
                              <Button
                                color="secondary"
                                className="hidden text-center sm:block"
                                href={acceptPath}>
                                {t("booking_accept_intent")}
                              </Button>
                              <Button
                                className="hidden sm:block"
                                onClick={async () => {
                                  router.push(
                                    `${rejectPath}?reason=${encodeURIComponent(cancellationReason)}`
                                  );
                                }}>
                                {t("rejection_confirmation")}
                              </Button>
                              <Button
                                color="secondary"
                                className="block text-center sm:hidden"
                                href={acceptPath}>
                                {t("accept")}
                              </Button>
                              <Button
                                className="block sm:hidden"
                                onClick={async () => {
                                  router.push(
                                    `${rejectPath}?reason=${encodeURIComponent(cancellationReason)}`
                                  );
                                }}>
                                {t("reject")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const parsedQuery = requestSchema.safeParse(context.query);

  // Parsing error, showing error 500 with message
  if (parsedQuery.success === false) {
    return {
      redirect: {
        destination: `/500?error=${parsedQuery.error.errors[0].message.concat(
          " accessing " + context.resolvedUrl
        )}`,
        permanent: false,
      },
    };
  }

  const {
    link: [action, email, bookingUid],
    reason,
  } = parsedQuery.data;

  const isAccept = action === DirectAction.accept;

  const bookingRaw = await prisma?.booking.findFirst({
    where: {
      uid: bookingUid,
      user: {
        email,
      },
    },
    select: {
      location: true,
      description: true,
      id: true,
      recurringEventId: true,
      status: true,
      title: true,
      startTime: true,
      endTime: true,
      eventType: {
        select: {
          recurringEvent: true,
        },
      },
      attendees: {
        select: {
          locale: true,
          name: true,
          email: true,
          timeZone: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          timeZone: true,
          locale: true,
          destinationCalendar: true,
          credentials: true,
          username: true,
        },
      },
    },
  });

  // Booking not found, showing error 500 with message
  if (!bookingRaw) {
    return {
      redirect: {
        destination: `/500?error=${pageErrors.booking_not_found.concat(" accessing " + context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  const booking = {
    ...bookingRaw,
    startTime: bookingRaw.startTime.toString(),
    endTime: bookingRaw.endTime.toString(),
    eventType: {
      ...bookingRaw.eventType,
      recurringEvent: parseRecurringEvent(bookingRaw?.eventType?.recurringEvent),
    },
    attendees: bookingRaw?.attendees.map((att) => ({
      ...att,
      language: {
        locale: att.locale ?? "en",
      },
    })),
  };

  // Booking user not found, showing error 500 with message
  if (booking.user === null) {
    return {
      redirect: {
        destination: `/500?error=${pageErrors.user_not_found.concat(" accessing " + context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  // Booking already accepted or rejected
  if (booking.status !== BookingStatus.PENDING) {
    return {
      props: {
        booking,
        status: null,
      },
    };
  }

  // Trying to reject booking without reason
  if (!isAccept && reason === undefined) {
    return {
      props: {
        booking,
        status: BookingStatus.PENDING,
      },
    };
  }

  // Booking good to be accepted or rejected, proceeding to mark it
  let result: { status: BookingStatus | undefined } = { status: undefined };
  try {
    result = await processBookingConfirmation(
      {
        bookingId: booking.id,
        user: booking.user,
        recurringEventId: booking.recurringEventId,
        confirmed: action === DirectAction.accept,
        rejectionReason: reason,
      },
      prisma
    );
  } catch (e) {
    if (e instanceof TRPCError) {
      return {
        redirect: {
          destination: `/500?error=${e.message.concat(" accessing " + context.resolvedUrl)}`,
          permanent: false,
        },
      };
    }
  }

  return {
    props: {
      booking,
      status: result.status,
      reason: context.query.reason ?? null,
    },
  };
}
