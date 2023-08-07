import React from "react";

import { APP_NAME } from "@calcom/lib/constants";

import type { DigestEmailType } from "../../templates/email-digest";
import { BaseEmailHtml } from "../components";

export const EmailDigest = (props: DigestEmailType & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
  const paymentCurrencies = Array.from(props.paymentsMap.keys());
  return (
    <BaseEmailHtml subject={props.language("verify_email_subject", { appName: APP_NAME })}>
      <p>CAL_LOGO_HERE</p>
      <p>
        In the last 30 days, you hosted {props.totalHostedEvents} events and attended{" "}
        {props.totalAttendedEvents} events
      </p>
      <p>
        You hosted {props.uniqueBookedUsers.size} unique user(s) from {props.uniqueBookedTimeZones.size} time
        zones
      </p>
      <p>
        Here are your earnings
        <br />
        {paymentCurrencies.map((currency) => (
          <React.Fragment key={currency}>
            <span>{props.paymentsMap.get(currency)}</span> <span>{currency}</span>{" "}
          </React.Fragment>
        ))}{" "}
      </p>
      <p>Top {props.topBookedEvents.length} Booked Event(s)</p>
      <p>Event Title - Booked</p>
      {props.topBookedEvents.map((event) => {
        return (
          <p key={event[0]}>
            <span>{event[0]}</span> - <span>{event[1]}</span>
          </p>
        );
      })}
    </BaseEmailHtml>
  );
};
