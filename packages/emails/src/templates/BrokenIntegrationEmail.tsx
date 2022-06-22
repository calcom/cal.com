import { TFunction } from "next-i18next";

import { AppStoreLocationType } from "@calcom/app-store/locations";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

// https://stackoverflow.com/questions/56263980/get-key-of-an-enum-from-its-value-in-typescript
export function getEnumKeyByEnumValue(myEnum: any, enumValue: number | string): string {
  const keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
  return keys.length > 0 ? keys[0] : "";
}

const BrokenVideoIntegration = (props: {
  location: string;
  eventTypeId: number | undefined;
  t: TFunction;
}) => {
  const { t } = props;
  return (
    <>
      {t("broken_video_integration", props.location)}
      <a
        href={
          props.eventTypeId ? `${WEBAPP_URL}/event-types/${props.eventTypeId}` : `${WEBAPP_URL}/event-types`
        }>
        {t<string>("change_location")}
      </a>{" "}
      {t("or").toLowerCase()} <a href={`${WEBAPP_URL}/apps/installed`}>{t<string>("remove_and_add_app")}</a>
    </>
  );
};

const BrokenCalendarIntegration = (props: {
  calendar: string;
  eventTypeId: number | undefined;
  t: TFunction;
}) => {
  const { t } = props;
  return (
    <>
      {t("couldn't_update_calendar", props.calendar)}
      <a href={`${WEBAPP_URL}/apps/installed`}>{t<string>("check_calendar")}</a>
    </>
  );
};

export const BrokenIntegrationEmail = async (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    type: string;
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { calEvent, type } = props;
  const t = calEvent.organizer.language.translate;

  // TODO extract event type ID from this query and pass down
  const eventTypeIdQuery = await prisma.eventType.findFirst({
    where: {
      title: calEvent.type,
      users: {
        some: {
          email: calEvent.organizer.email,
        },
      },
    },
    select: {
      id: true,
    },
  });

  const eventTypeId = eventTypeIdQuery?.id;

  if (type === "video") {
    let location = calEvent.location ? getEnumKeyByEnumValue(AppStoreLocationType, calEvent.location) : " ";

    if (location === "GoogleMeet") {
      location = location.slice(0, 5) + " " + location.slice(5);
    }

    return (
      <BaseScheduledEmail
        timeZone={calEvent.organizer.timeZone}
        t={t}
        subject="Broken Integration"
        title="There was a problem adding a video link"
        subtitle={<BrokenVideoIntegration location={location} eventTypeId={eventTypeId} t={t} />}
        headerType="xCircle"
        {...props}
      />
    );
  }

  if (type === "calendar") {
    // The calendar name is stored as name_calendar
    let calendar = calEvent.destinationCalendar
      ? calEvent.destinationCalendar?.integration.split("_")
      : "calendar";
    if (Array.isArray(calendar)) {
      const calendarCap = calendar.map((name) => name.charAt(0).toUpperCase());
      calendar = calendarCap[0] + " " + calendarCap[1];
    }

    return (
      <BaseScheduledEmail
        timeZone={calEvent.organizer.timeZone}
        t={t}
        subject="Broken Integration"
        title="There was a problem updating your calendar"
        subtitle={<BrokenCalendarIntegration calendar={calendar} eventTypeId={eventTypeId} t={t} />}
        headerType="xCircle"
        {...props}
      />
    );
  }
};
