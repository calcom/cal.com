import { TFunction } from "next-i18next";
import { Trans } from "react-i18next";

import { CAL_URL } from "@calcom/lib/constants";

import { BaseEmailHtml, CallToAction } from "../components";

export const DisabledAppEmail = (
  props: {
    appName: string;
    appType: string[];
    t: TFunction;
    title?: string;
    eventTypeId?: number;
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const { title, appName, eventTypeId, t, appType } = props;

  return (
    <BaseEmailHtml
      // subject={t("payment_app_disabled")}
      subject="App disabled">
      <p>
        {/* <Trans i18n="disabled_payment_email_body" t={t}> */}
        The admin has disabled {appName} which affects your event type {title}.{/* </Trans> */}
      </p>
      Attendees are still able to book this type of event but will not be prompted to pay. You may hide hide
      the event type to prevent this until your admin renables your payment method.
      <p />
      <hr />
      <CallToAction
        // label={props.language("edit_event_type")}
        label="Edit event type"
        href={`${CAL_URL}/event-types/${eventTypeId}?tabName=apps`}
      />
    </BaseEmailHtml>
  );
};
