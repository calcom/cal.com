import { APP_NAME, SENDER_NAME, SUPPORT_MAIL_ADDRESS, WEBAPP_URL } from "@calcom/lib/constants";

import { BaseEmailHtml } from "../components";
import type { SmsLimitReachedData } from "./SmsLimitReachedEmail";

export const SmsLimitAlmostReachedEmail = (props: SmsLimitReachedData) => {
  return (
    <BaseEmailHtml subject={props.user.t("sms_limit_almost_reached_subject", { appName: APP_NAME })}>
      <div>
        <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
          {props.user.t("hi_user_name", { name: props.user.name })}!
        </p>
        <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
          {props.user.t("sms_limit_almost_reached_email", { teamName: props.team.name })}
          {props.user.t("sms_limit_avoid_interruptions", {
            url: `${WEBAPP_URL}/settings/team${props.team.id}/smsCredits`,
          })}
        </p>
        <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
          {props.user.t("limit_reached_send_sms_as_email")}
        </p>
      </div>
      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>
            {props.user.t("happy_scheduling")}, <br />
            <a
              href={`mailto:${SUPPORT_MAIL_ADDRESS}`}
              style={{ color: "#3E3E3E" }}
              target="_blank"
              rel="noreferrer">
              <>{props.user.t("the_calcom_team", { companyName: SENDER_NAME })}</>
            </a>
          </>
        </p>
      </div>
    </BaseEmailHtml>
  );
};
