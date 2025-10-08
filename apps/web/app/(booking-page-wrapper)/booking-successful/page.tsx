"use client";

import { useSearchParams } from "next/navigation";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";

interface BookingSuccessCardProps {
  title: string;
  formattedDate: string;
  formattedTime: string;
  endTime: string;
  formattedTimeZone: string;
  hostName: string | null;
  hostEmail: string | null;
  attendeeName: string | null;
  attendeeEmail: string | null;
  location: string | null;
  t: (key: string) => string;
}

function BookingSuccessCard({
  title,
  formattedDate,
  formattedTime,
  endTime,
  formattedTimeZone,
  hostName,
  hostEmail,
  attendeeName,
  attendeeEmail,
  location,
  t,
}: BookingSuccessCardProps) {
  return (
    <div className="h-screen">
      <main className="mx-auto max-w-3xl">
        <div className="overflow-y-auto">
          <div className="flex items-end justify-center px-4 pb-20 pt-4 text-center sm:flex sm:p-0">
            <div className="main my-4 flex flex-col transition-opacity sm:my-0 inset-0" aria-hidden="true">
              <div
                className="inline-block transform overflow-hidden rounded-lg sm:my-8 sm:max-w-xl bg-default dark:bg-muted border-booker border-booker-width px-8 pb-4 pt-5 text-left align-bottom transition-all sm:w-full sm:py-8 sm:align-middle"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success">
                    <Icon name="check" className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="mb-8 mt-6 text-center last:mb-0">
                  <h3 className="text-emphasis text-2xl font-semibold leading-6" id="modal-headline">
                    {t("meeting_is_scheduled")}
                  </h3>

                  <div className="mt-3">
                    <p className="text-default">{t("emailed_you_and_any_other_attendees")}</p>
                  </div>

                  <div className="border-subtle text-default mt-8 grid grid-cols-3 gap-x-4 border-t pt-8 text-left rtl:text-right sm:gap-x-0">
                    <div className="font-medium">{t("what")}</div>
                    <div className="col-span-2 mb-6 last:mb-0">{title}</div>

                    {formattedDate && (
                      <>
                        <div className="font-medium">{t("when")}</div>
                        <div className="col-span-2 mb-6 last:mb-0">
                          {formattedDate}
                          {formattedTime && (
                            <>
                              <br />
                              {formattedTime}
                              {endTime && ` - ${endTime}`}
                              {formattedTimeZone && (
                                <span className="text-bookinglight"> ({formattedTimeZone})</span>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}

                    <div className="font-medium">{t("who")}</div>
                    <div className="col-span-2 last:mb-0">
                      {hostName && (
                        <div className="mb-3">
                          <div>
                            <span className="mr-2">{hostName}</span>
                            <Badge variant="blue">{t("Host")}</Badge>
                          </div>
                          {hostEmail && <p className="text-default">{hostEmail}</p>}
                        </div>
                      )}
                      {attendeeName && (
                        <div className="mb-3 last:mb-0">
                          <p>{attendeeName}</p>
                          {attendeeEmail && <p>{attendeeEmail}</p>}
                        </div>
                      )}
                    </div>

                    {location && (
                      <>
                        <div className="mt-3 font-medium">{t("where")}</div>
                        <div className="col-span-2 mt-3">{t("web_conferencing_details_to_follow")}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookingSuccessful() {
  const { t } = useLocale();
  const searchParams = useSearchParams();

  const title = searchParams?.get("title") || t("booking_confirmed");
  const startTime = searchParams?.get("startTime");
  const location = searchParams?.get("location");
  const attendeeName = searchParams?.get("attendeeName");
  const attendeeEmail = searchParams?.get("email");
  const hostName = searchParams?.get("hostName");
  const hostEmail = searchParams?.get("hostEmail");
  const attendeeStartTime = searchParams?.get("attendeeStartTime");
  const timeZone = searchParams?.get("timeZone");

  const formattedDate = startTime ? dayjs(startTime).format("dddd, MMMM D, YYYY") : "";
  const formattedTime = attendeeStartTime ? dayjs(attendeeStartTime).format("h:mm A") : "";
  const endTime = attendeeStartTime ? dayjs(attendeeStartTime).add(30, "minute").format("h:mm A") : "";
  const formattedTimeZone = timeZone || dayjs.tz.guess();

  return (
    <BookingSuccessCard
      title={title}
      formattedDate={formattedDate}
      formattedTime={formattedTime}
      endTime={endTime}
      formattedTimeZone={formattedTimeZone}
      hostName={hostName ?? null}
      hostEmail={hostEmail ?? null}
      attendeeName={attendeeName ?? null}
      attendeeEmail={attendeeEmail ?? null}
      location={location ?? null}
      t={t}
    />
  );
}
