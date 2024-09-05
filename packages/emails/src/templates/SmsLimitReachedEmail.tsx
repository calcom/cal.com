import { type TFunction } from "next-i18next";

import { APP_NAME, SENDER_NAME, SUPPORT_MAIL_ADDRESS } from "@calcom/lib/constants";

import { BaseEmailHtml } from "../components";

export type SmsLimitAlmostReachedData = {
  teamName: string;
  user: {
    email: string;
    name: string | null;
    t: TFunction;
  };
};

export const SmsLimitReachedEmail = (props: SmsLimitAlmostReachedData) => {
  //todo
  return (
    <BaseEmailHtml subject={props.user.t("sms_limit_almost_reached_subject", { appName: APP_NAME })}>
      <div>
        <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
          {props.user.t("hi_user_name", { name: props.user.name })}!
        </p>
        <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
          {props.user.t("sms_limit_reached_first_part", { teamName: props.teamName })}
        </p>
        <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
          {props.user.t("sms_limit_reached_second_part")}
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
