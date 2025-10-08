"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";

interface LocalStorageData {
  booking: {
    title: string | null;
    startTime: string;
    endTime: string;
    booker: { name: string; timeZone?: string; email: string } | null;
    host: { name: string; timeZone?: string } | null;
    location: string | null;
  };
  timestamp: number;
}

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
            <div className="main inset-0 my-4 flex flex-col transition-opacity sm:my-0" aria-hidden="true">
              <div
                className="bg-default dark:bg-muted border-booker border-booker-width inline-block transform overflow-hidden rounded-lg px-8 pb-4 pt-5 text-left align-bottom transition-all sm:my-8 sm:w-full sm:max-w-xl sm:py-8 sm:align-middle"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="bg-success mx-auto flex h-12 w-12 items-center justify-center rounded-full">
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
  const router = useRouter();
  const params = useParams();
  const [bookingData, setBookingData] = useState<LocalStorageData | null>(null);

  const localStorageUid = params?.localStorageUid as string;

  useEffect(() => {
    if (!localStorageUid) {
      router.push("/404");
      return;
    }

    const storageKey = `cal.booking-success.${localStorageUid}`;
    const dataStr = localStorage.getItem(storageKey);

    if (!dataStr) {
      router.push("/404");
      return;
    }

    const data: LocalStorageData = JSON.parse(dataStr);

    // Check if the data is too old (24 hours)
    const dataAge = Date.now() - data.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (dataAge > maxAge) {
      // Remove the data from localStorage after reading
      localStorage.removeItem(storageKey);
      router.push("/404");
      return;
    }

    setBookingData(data);
  }, [localStorageUid, router]);

  if (!bookingData) {
    return null;
  }

  const { booking } = bookingData;

  // Format the data for the BookingSuccessCard
  const startTime = booking.startTime ? dayjs(booking.startTime) : null;
  const endTime = booking.endTime ? dayjs(booking.endTime) : null;
  const timeZone = booking.booker?.timeZone || booking.host?.timeZone || dayjs.tz.guess();

  const formattedDate = startTime ? startTime.tz(timeZone).format("dddd, MMMM D, YYYY") : "";
  const formattedTime = startTime ? startTime.tz(timeZone).format("h:mm A") : "";
  const formattedEndTime = endTime ? endTime.tz(timeZone).format("h:mm A") : "";
  const formattedTimeZone = timeZone;

  const hostName = booking.host?.name || null;
  const hostEmail = null; // Email not stored for spam decoy bookings
  const attendeeName = booking.booker?.name || null;
  const attendeeEmail = booking.booker?.email || null;

  return (
    <BookingSuccessCard
      title={booking.title || "Booking"}
      formattedDate={formattedDate}
      formattedTime={formattedTime}
      endTime={formattedEndTime}
      formattedTimeZone={formattedTimeZone}
      hostName={hostName}
      hostEmail={hostEmail}
      attendeeName={attendeeName}
      attendeeEmail={attendeeEmail}
      location={booking.location || null}
      t={t}
    />
  );
}
