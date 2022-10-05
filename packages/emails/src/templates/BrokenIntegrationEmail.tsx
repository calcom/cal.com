import { TFunction } from "next-i18next";
import { Trans } from "react-i18next";

import { AppStoreLocationType } from "@calcom/app-store/locations";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

// https://stackoverflow.com/questions/56263980/get-key-of-an-enum-from-its-value-in-typescript
export function getEnumKeyByEnumValue(myEnum: any, enumValue: number | string): string {
  const keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
  return keys.length > 0 ? keys[0] : "";
}

const BrokenVideoIntegration = (props: { location: string; eventTypeId?: number | null; t: TFunction }) => {
  return (
    <Trans i18nKey="broken_video_action" t={props.t}>
      We could not add the <span>{props.location}</span> meeting link to your scheduled event. Contact your
      invitees or update your calendar event to add the details. You can either&nbsp;
      <a
        href={
          props.eventTypeId ? `${WEBAPP_URL}/event-types/${props.eventTypeId}` : `${WEBAPP_URL}/event-types`
        }>
        change your location on the event type
      </a>
      &nbsp;or try&nbsp;
      <a href={`${WEBAPP_URL}/apps/installed`}>removing and adding the app again.</a>
    </Trans>
  );
};

const BrokenCalendarIntegration = (props: {
  calendar: string;
  eventTypeId?: number | null;
  t: TFunction;
}) => {
  const { t } = props;

  return (
    <Trans i18nKey="broken_calendar_action" t={props.t}>
      We could not update your <span>{props.calendar}</span>.{" "}
      <a href={`${WEBAPP_URL}/apps/installed`}>
        Please check your calendar settings or remove and add your calendar again
      </a>
    </Trans>
  );
};

export const BrokenIntegrationEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    type: "video" | "calendar";
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { calEvent, type } = props;
  const t = calEvent.organizer.language.translate;

  if (type === "video") {
    let location = calEvent.location ? getEnumKeyByEnumValue(AppStoreLocationType, calEvent.location) : " ";
    if (location === "Daily") {
      location = "Cal Video";
    }
    if (location === "GoogleMeet") {
      location = location.slice(0, 5) + " " + location.slice(5);
    }

    return (
      <BaseScheduledEmail
        timeZone={calEvent.organizer.timeZone}
        t={t}
        subject={t("broken_integration")}
        title={t("problem_adding_video_link")}
        subtitle={<BrokenVideoIntegration location={location} eventTypeId={calEvent.eventTypeId} t={t} />}
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
      const calendarCap = calendar.map((name) => name.charAt(0).toUpperCase() + name.slice(1));
      calendar = calendarCap[0] + " " + calendarCap[1];
    }

    return (
      <BaseScheduledEmail
        timeZone={calEvent.organizer.timeZone}
        t={t}
        subject={t("broken_integration")}
        title={t("problem_updating_calendar")}
        subtitle={<BrokenCalendarIntegration calendar={calendar} eventTypeId={calEvent.eventTypeId} t={t} />}
        headerType="xCircle"
        {...props}
      />
    );
  }

  return (
    <BaseScheduledEmail
      timeZone={calEvent.organizer.timeZone}
      t={t}
      subject={t("broken_integration")}
      title={t("problem_updating_calendar")}
      headerType="xCircle"
      {...props}
    />
  );
};
