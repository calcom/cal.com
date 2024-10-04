import { Trans, type TFunction } from "next-i18next";

import dayjs from "@calcom/dayjs";
import { APP_NAME, SENDER_NAME, SUPPORT_MAIL_ADDRESS, WEBAPP_URL } from "@calcom/lib/constants";

import { BaseEmailHtml } from "../components";

export type SmsLimitReachedData = {
  team?: {
    id: number;
    name: string;
  };
  user: {
    email: string;
    name: string | null;
    t: TFunction;
  };
};

export const SmsLimitReachedEmail = (props: SmsLimitReachedData) => {
  let emailBody;

  if (props.team) {
    emailBody = (
      <>
        <div>
          <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
            {props.user.t("hi_user_name", { name: props.user.name })}!
          </p>
          <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
            {props.user.t("sms_limit_reached_email", {
              teamName: props.team.name,
              month: dayjs().format("MMMM"),
            })}
          </p>
          <p style={{ fontWeight: "normal", fontSize: "16px", lineHeight: "24px" }}>
            <Trans i18nKey="sms_limit_prevent_interruptions" t={props.user.t}>
              To prevent any interruptions in your SMS service, you can enable payment for SMS that exceed
              your limit. Adjust your settings{" "}
              <a href={`${WEBAPP_URL}/settings/teams/${props.team.id}/smsCredits`} className="underline">
                here
              </a>
              .
            </Trans>
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
      </>
    );
  } else if (props.user) {
    emailBody = <div>todo</div>;
  }

  return (
    <BaseEmailHtml subject={props.user.t("sms_limit_almost_reached_subject", { appName: APP_NAME })}>
      {emailBody}
    </BaseEmailHtml>
  );
};
