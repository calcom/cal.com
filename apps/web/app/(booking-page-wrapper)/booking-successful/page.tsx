"use client";

import { useSearchParams } from "next/navigation";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

export default function BookingSuccessful() {
  const { t } = useLocale();
  const searchParams = useSearchParams();

  const title = searchParams.get("title") || t("booking_confirmed");
  const startTime = searchParams.get("startTime");
  const location = searchParams.get("location");
  const attendeeName = searchParams.get("attendeeName");
  const attendeeEmail = searchParams.get("email");
  const hostName = searchParams.get("hostName");
  const attendeeStartTime = searchParams.get("attendeeStartTime");

  const formattedDate = startTime ? dayjs(startTime).format("dddd, MMMM D, YYYY") : "";
  const formattedTime = attendeeStartTime ? dayjs(attendeeStartTime).format("h:mm A") : "";

  return (
    <div className="flex h-screen">
      <div className="bg-default m-auto max-w-2xl rounded-md p-10 text-center">
        <div className="bg-success mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon name="check" className="text-inverted h-6 w-6" />
        </div>

        <h1 className="text-emphasis mb-4 text-2xl font-medium">{t("booking_confirmed")}</h1>

        <p className="text-default mb-8 text-sm">{t("booking_confirmed_description")}</p>

        <div className="border-subtle text-default mt-8 grid grid-cols-3 border-t pt-8 text-left">
          <div className="font-medium">{t("what")}</div>
          <div className="col-span-2 mb-6">{title}</div>

          {formattedDate && (
            <>
              <div className="font-medium">{t("when")}</div>
              <div className="col-span-2 mb-6">
                {formattedDate}
                {formattedTime && (
                  <>
                    <br />
                    {formattedTime}
                  </>
                )}
              </div>
            </>
          )}

          <div className="font-medium">{t("who")}</div>
          <div className="col-span-2 mb-6">
            {hostName && (
              <div className="mb-3">
                <span className="font-medium">{hostName}</span>
                <span className="text-subtle ml-2">({t("organizer")})</span>
              </div>
            )}
            {attendeeName && (
              <div>
                <p className="font-medium">{attendeeName}</p>
                {attendeeEmail && <p className="text-subtle text-sm">{attendeeEmail}</p>}
              </div>
            )}
          </div>

          {location && (
            <>
              <div className="font-medium">{t("where")}</div>
              <div className="col-span-2 mb-6">{location}</div>
            </>
          )}
        </div>

        <div className="text-subtle mt-8 text-sm">{t("confirmation_email_sent")}</div>
      </div>
    </div>
  );
}
