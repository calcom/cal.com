"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";

export default function DryRunSuccessful() {
  const { t } = useLocale();

  const sampleBookingInfo = {
    startTime: "2024-01-20T10:00:00Z",
    endTime: "2024-01-20T11:00:00Z",
    title: "Sample Meeting",
    description: "This is a sample dry run booking",
    attendees: [
      {
        email: "attendee@example.com",
        name: "Sample Attendee",
        timeZone: "America/New_York",
      },
    ],
    user: {
      name: "Sample Host",
      email: "host@example.com",
    },
    location: "Zoom Meeting",
    status: "ACCEPTED",
    uid: "sample-uid",
  };

  const sampleEventType = {
    title: "Sample Event Type",
    length: 60,
    eventName: "Sample Meeting",
    description: "This is a sample event type for dry run",
    requiresConfirmation: false,
    recurringEvent: null,
  };

  return (
    <div className="flex h-screen">
      <div className="bg-default m-auto rounded-md p-10 text-center">
        <div className="bg-cal-success mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon name="check" className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-emphasis mb-4 text-2xl font-medium" data-testid="dry-run-success-msg">
          {t("booking_dry_run_successful")}
        </h1>
        <p className="text-default mb-8 max-w-2xl text-sm">{t("booking_dry_run_successful_description")}</p>

        {/* <div className="border-subtle text-default mt-8 grid grid-cols-3 border-t pt-8 text-left">
          <div className="font-medium">{t("what")}</div>
          <div className="col-span-2 mb-6">{sampleBookingInfo.title}</div>

          <div className="font-medium">{t("when")}</div>
          <div className="col-span-2 mb-6">{new Date(sampleBookingInfo.startTime).toLocaleString()}</div>

          <div className="font-medium">{t("who")}</div>
          <div className="col-span-2 mb-6">
            <div className="mb-3">
              <div>
                <span className="mr-2">{sampleBookingInfo.user.name}</span>
                <Badge variant="blue">{t("Host")}</Badge>
              </div>
              <p className="text-default">{sampleBookingInfo.user.email}</p>
            </div>
            <div>
              <p>{sampleBookingInfo.attendees[0].name}</p>
              <p>{sampleBookingInfo.attendees[0].email}</p>
            </div>
          </div>

          <div className="font-medium">{t("where")}</div>
          <div className="col-span-2 mb-6">{sampleBookingInfo.location}</div>
        </div> */}
      </div>
    </div>
  );
}
