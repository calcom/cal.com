import type { CalendarEvent, Person, RecurringEvent } from "@calcom/types/Calendar";

import { BaseEmailHtml } from "../components/EmailHtml";

function Info(props: {
  label: string;
  description: React.ReactNode | undefined | null;
  extraInfo?: React.ReactNode;
  withSpacer?: boolean;
}) {
  if (!props.description) return null;
  return (
    <>
      {props.withSpacer && <Spacer />}
      <div style={{ lineHeight: "6px" }}>
        <p style={{ color: "#494949" }}>{props.label}</p>
        <p style={{ color: "#494949", fontWeight: 400, lineHeight: "24px", whiteSpace: "pre-wrap" }}>
          {props.description}
        </p>
        {props.extraInfo}
      </div>
    </>
  );
}

const Spacer = () => <p style={{ height: 6 }} />;

const AttendeeScheduledEmail = (props: {
  calEvent: CalendarEvent;
  attendee: Person;
  recurringEvent: RecurringEvent;
}) => {
  return (
    <BaseEmailHtml>
      <Info
        label={props.calEvent.attendees[0].language.translate("what")}
        description={props.calEvent.type}
      />
      {/* 
      ${this.getWhen()}
      ${this.getWho()}
      ${this.getLocation()}
    */}
      <Info
        label={props.calEvent.organizer.language.translate("description")}
        description={props.calEvent.description}
        withSpacer
      />
      <Info
        label={props.calEvent.attendees[0].language.translate("additional_notes")}
        description={props.calEvent.additionalNotes}
      />
      {/* ${this.getCustomInputs()} */}
    </BaseEmailHtml>
  );
};

export default AttendeeScheduledEmail;
