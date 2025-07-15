import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import { getSanitizedCalEvent, sanitizeText } from "@calcom/lib/CalEventParser";
// Add sanitizeText import
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

  const sanitizedCalEvent = getSanitizedCalEvent(props.calEvent);
  const additionalNotesDescription = sanitizedCalEvent.additionalNotes || "";
  const rejectionReason = sanitizedCalEvent.rejectionReason || "";
  const cancellationReason = sanitizedCalEvent.cancellationReason || "";
  const title = sanitizedCalEvent.title || "";
  const description = sanitizedCalEvent.description || "";
  const rescheduledBySanitized = rescheduledBy ? sanitizeText(rescheduledBy) : "";
  const reassignedName = props.reassigned?.name ? sanitizeText(props.reassigned.name) : "";
  const reassignedReason = props.reassigned?.reason ? sanitizeText(props.reassigned.reason) : "";
  const reassignedByUser = props.reassigned?.byUser ? sanitizeText(props.reassigned.byUser) : "";

  return (
    <BaseEmailHtml
      hideLogo={Boolean(props.calEvent.platformClientId)}
      headerType={props.headerType || "checkCircle"}
      subject={props.subject || subject}
      title={t(
        props.title
          ? props.title
          : sanitizedCalEvent.recurringEvent?.count
          ? "your_event_has_been_scheduled_recurring"
          : "your_event_has_been_scheduled"
      )}
      callToAction={
        props.callToAction === null
          ? null
          : props.callToAction || <ManageLink attendee={props.attendee} calEvent={sanitizedCalEvent} />
      }
      subtitle={props.subtitle || <>{t("emailed_you_and_any_other_attendees")}</>}>
      {rejectionReason && (
        <>
          <Info label={t("rejection_reason")} description={rejectionReason} withSpacer />
        </>
      )}
      {cancellationReason && (
        <Info
          label={t(cancellationReason.startsWith("$RCH$") ? "reason_for_reschedule" : "cancellation_reason")}
          description={cancellationReason.replace("$RCH$", "")}
          withSpacer
        />
      )}
      {props.reassigned && !props.reassigned.byUser && (
        <>
          <Info
            label={t("reassigned_to")}
            description={
              <PersonInfo
                name={reassignedName || undefined}
                email={sanitizeText(props.reassigned.email) || props.reassigned.email}
              />
            }
            withSpacer
          />
          {props.reassigned?.reason && (
            <Info label={t("reason")} description={props.reassigned.reason} withSpacer />
          )}
        </>
      )}
      {props.reassigned && props.reassigned.byUser && (
        <>
          <Info label={t("reassigned_by")} description={reassignedByUser} withSpacer />
          {reassignedReason && <Info label={t("reason")} description={reassignedReason} withSpacer />}
        </>
      )}
      {rescheduledBySanitized && (
        <Info label={t("rescheduled_by")} description={rescheduledBySanitized} withSpacer />
      )}
      <Info label={t("what")} description={title} withSpacer />
      <WhenInfo
        timeFormat={timeFormat}
        calEvent={sanitizedCalEvent}
        t={t}
        timeZone={timeZone}
        locale={locale}
      />
      <WhoInfo calEvent={sanitizedCalEvent} t={t} />
      <LocationInfo calEvent={sanitizedCalEvent} t={t} />
      <Info label={t("description")} description={description} withSpacer formatted />
      {sanitizedCalEvent.additionalNotes && (
        <Info label={t("additional_notes")} description={additionalNotesDescription} withSpacer />
      )}
      {props.includeAppsStatus && <AppsStatus calEvent={sanitizedCalEvent} t={t} />}
      <UserFieldsResponses t={t} calEvent={sanitizedCalEvent} isOrganizer={props.isOrganizer} />
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
    </BaseEmailHtml>
  );
};
