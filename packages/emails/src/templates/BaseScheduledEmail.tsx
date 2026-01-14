import type { TFunction } from "next-i18next";
import React from "react";

import dayjs from "@calcom/dayjs";
import getRunningLateLink from "@calcom/features/bookings/lib/getRunningLateLink";
import { formatPrice } from "@calcom/lib/price";
import { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import {
  BaseEmailHtml,
  Info,
  LocationInfo,
  ManageLink,
  WhenInfo,
  WhoInfo,
  AppsStatus,
  UserFieldsResponses,
} from "../components";
import { PersonInfo } from "../components/WhoInfo";

export const BaseScheduledEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    timeZone: string;
    includeAppsStatus?: boolean;
    t: TFunction;
    locale: string;
    timeFormat: TimeFormat | undefined;
    isOrganizer?: boolean;
    reassigned?: { name: string | null; email: string; reason?: string; byUser?: string };
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const { t, timeZone, locale, timeFormat: timeFormat_ } = props;

  const timeFormat = timeFormat_ ?? TimeFormat.TWELVE_HOUR;

  function getRecipientStart(format: string) {
    return dayjs(props.calEvent.startTime).tz(timeZone).format(format);
  }

  function getRecipientEnd(format: string) {
    return dayjs(props.calEvent.endTime).tz(timeZone).format(format);
  }

  // Helper function to format cancelled dates
  function formatCancelledDates() {
    const exDates = props.calEvent.recurringEvent?.exDates;
    if (!exDates || exDates.length === 0) {
      return null;
    }

    const maxDatesToShow = 5;
    const datesToDisplay = exDates.slice(0, maxDatesToShow);
    const hasMoreDates = exDates.length > maxDatesToShow;

    const formattedDates = datesToDisplay.map((dateValue) => {
      // Handle both Date objects and ISO date strings
      let date;
      if (dateValue instanceof Date) {
        date = dayjs(dateValue).tz(timeZone).locale(locale);
      } else if (typeof dateValue === "string") {
        date = dayjs(dateValue).tz(timeZone).locale(locale);
      } else {
        // Fallback for any other format
        date = dayjs(dateValue).tz(timeZone).locale(locale);
      }

      const timeFormatStr = timeFormat === TimeFormat.TWELVE_HOUR ? "h:mma" : "HH:mm";
      return `${date.format(`dddd, LL`)} | ${date.format(timeFormatStr)}`;
    });

    return (
      <>
        {formattedDates.map((dateStr, index) => (
          <div key={index} style={{ textDecoration: "line-through", color: "#6B7280" }}>
            {dateStr}
          </div>
        ))}
        {hasMoreDates && <div style={{ color: "#6B7280", marginTop: "4px" }}>...</div>}
      </>
    );
  }

  const subject = t(props.subject || "confirmed_event_type_subject", {
    eventType: props.calEvent.type,
    name: props.calEvent.team?.name || props.calEvent.organizer.name,
    date: `${getRecipientStart("h:mma")} - ${getRecipientEnd("h:mma")}, ${t(
      getRecipientStart("dddd").toLowerCase()
    )}, ${t(getRecipientStart("MMMM").toLowerCase())} ${getRecipientStart("D, YYYY")}`,
  });

  let rescheduledBy = props.calEvent.rescheduledBy;
  if (
    rescheduledBy &&
    rescheduledBy === props.calEvent.organizer.email &&
    props.calEvent.hideOrganizerEmail
  ) {
    const personWhoRescheduled = [props.calEvent.organizer, ...props.calEvent.attendees].find(
      (person) => person.email === rescheduledBy
    );
    rescheduledBy = personWhoRescheduled?.name;
  }

  // Check if this is a recurring event cancellation with specific dates
  const hasRecurringCancellations =
    props.calEvent.recurringEvent?.exDates && props.calEvent.recurringEvent.exDates.length > 0;

  return (
    <BaseEmailHtml
      bannerUrl={props.calEvent.bannerUrl}
      hideLogo={Boolean(props.calEvent.platformClientId)}
      headerType={props.headerType || "checkCircle"}
      subject={props.subject || subject}
      title={t(
        props.title
          ? props.title
          : props.calEvent.recurringEvent?.count
          ? "your_event_has_been_scheduled_recurring"
          : "your_event_has_been_scheduled"
      )}
      callToAction={
        props.callToAction === null
          ? null
          : props.callToAction || <ManageLink attendee={props.attendee} calEvent={props.calEvent} />
      }
      subtitle={props.subtitle || <>{t("emailed_you_and_any_other_attendees")}</>}>
      {props.calEvent.rejectionReason && (
        <>
          <Info label={t("rejection_reason")} description={props.calEvent.rejectionReason} withSpacer />
        </>
      )}
      {props.calEvent.cancellationReason && (
        <Info
          label={t(
            props.calEvent.cancellationReason.startsWith("$RCH$")
              ? "reason_for_reschedule"
              : "cancellation_reason"
          )}
          description={
            !!props.calEvent.cancellationReason && props.calEvent.cancellationReason.replace("$RCH$", "")
          } // Removing flag to distinguish reschedule from cancellation
          withSpacer
        />
      )}
      {props.reassigned && !props.reassigned.byUser && (
        <>
          <Info
            label={t("reassigned_to")}
            description={
              <PersonInfo name={props.reassigned.name || undefined} email={props.reassigned.email} />
            }
            withSpacer
          />
        </>
      )}
      {props.reassigned && props.reassigned.byUser && (
        <>
          <Info label={t("reassigned_by")} description={props.reassigned.byUser} withSpacer />
          {props.reassigned?.reason && (
            <Info label={t("reason")} description={props.reassigned.reason} withSpacer />
          )}
        </>
      )}
      {rescheduledBy && <Info label={t("rescheduled_by")} description={rescheduledBy} withSpacer />}
      <Info label={t("what")} description={props.calEvent.title} withSpacer />
      <WhenInfo timeFormat={timeFormat} calEvent={props.calEvent} t={t} timeZone={timeZone} locale={locale} />
      {hasRecurringCancellations && (
        <Info label={t("cancelled_occurrences")} description={formatCancelledDates()} withSpacer />
      )}
      <WhoInfo calEvent={props.calEvent} t={t} attendee={props.attendee} />
      <LocationInfo calEvent={props.calEvent} t={t} />
      <Info label={t("description")} description={props.calEvent.description} withSpacer formatted />
      <Info label={t("additional_notes")} description={props.calEvent.additionalNotes} withSpacer />
      {props.includeAppsStatus && <AppsStatus calEvent={props.calEvent} t={t} />}
      <UserFieldsResponses t={t} calEvent={props.calEvent} isOrganizer={props.isOrganizer} />
      {props.calEvent.paymentInfo?.amount && (
        <Info
          label={props.calEvent.paymentInfo.paymentOption === "HOLD" ? t("no_show_fee") : t("price")}
          description={formatPrice(
            props.calEvent.paymentInfo.amount,
            props.calEvent.paymentInfo.currency,
            props.attendee.language.locale
          )}
          withSpacer
        />
      )}
      {props.isOrganizer
        ? props.calEvent.attendees.map(
            (attendee, index) =>
              attendee.phoneNumber && (
                <Info
                  key={index}
                  label={t("running_late")}
                  description={t("connect_with_attendee", { name: attendee.name })}
                  withSpacer
                  link={getRunningLateLink(attendee.phoneNumber)}
                />
              )
          )
        : props.calEvent.organizer.phoneNumber &&
          props.calEvent.organizer.usePhoneForWhatsApp && (
            <Info
              label={t("running_late")}
              description={t("connect_with_host")}
              withSpacer
              link={getRunningLateLink(props.calEvent.organizer.phoneNumber)}
            />
          )}
    </BaseEmailHtml>
  );
};
