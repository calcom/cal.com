import type { TFunction } from "next-i18next";

import { APP_NAME, BASE_URL, IS_PRODUCTION } from "@calcom/lib/constants";

import { V2BaseEmailHtml, CallToAction } from "../components";

type TeamInvite = {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
};

export const TeamInviteEmail = (
  props: TeamInvite & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  return (
    <V2BaseEmailHtml
      subject={props.language("user_invited_you", {
        user: props.from,
        team: props.teamName,
        appName: APP_NAME,
      })}>
      <img
        height="64"
        src={
          IS_PRODUCTION
            ? BASE_URL + "/emails/teamCircle@2x.png"
            : "http://localhost:3000/emails/teamCircle@2x.png"
        }
        style={{
          border: "0",
          display: "block",
          outline: "none",
          textDecoration: "none",
          height: "64px",
          fontSize: "13px",
          marginBottom: "24px",
        }}
        width="64"
        alt=""
      />
      <p style={{ fontSize: "24px", marginBottom: "16px" }}>
        <>
          {props.language("user_invited_you", {
            user: props.from,
            team: props.teamName,
            appName: APP_NAME,
          })}
          !
        </>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "32px" }}>
        <>{props.language("calcom_explained", { appName: APP_NAME })}</>
      </p>
      <CallToAction label={props.language("accept_invitation")} href={props.joinLink} />

      <div style={{ borderTop: "1px solid #E1E1E1", marginTop: "32px", paddingTop: "32px" }}>
        <p style={{ fontWeight: 400, margin: 0 }}>
          <>
            {props.language("have_any_questions")}{" "}
            <a href="mailto:support@cal.com" style={{ color: "#3E3E3E" }} target="_blank" rel="noreferrer">
              <>{props.language("contact")}</>
            </a>{" "}
            {props.language("our_support_team")}
          </>
        </p>
      </div>
    </V2BaseEmailHtml>
  );
};
