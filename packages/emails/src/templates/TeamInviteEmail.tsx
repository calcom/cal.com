import type { TFunction } from "next-i18next";

import { APP_NAME, WEBAPP_URL, IS_PRODUCTION } from "@calcom/lib/constants";

import { V2BaseEmailHtml, CallToAction } from "../components";

type TeamInvite = {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
  isCalcomMember: boolean;
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
      <p style={{ fontSize: "24px", marginBottom: "16px", textAlign: "center" }}>
        <>{props.language("email_no_user_invite_heading", { appName: APP_NAME })}</>
      </p>
      <img
        style={{
          borderRadius: "16px",
          height: "270px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        src={
          IS_PRODUCTION
            ? WEBAPP_URL + "/emails/calendar-email-hero.png"
            : "http://localhost:3000/emails/calendar-email-hero.png"
        }
        alt=""
      />
      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "32px",
          marginTop: "32px",
          lineHeightStep: "24px",
        }}>
        <>{props.language("email_no_user_invite_subheading", { invitedBy: props.from, appName: APP_NAME })}</>
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CallToAction
          label={props.language(props.isCalcomMember ? "email_user_cta" : "email_no_user_cta")}
          href={props.joinLink}
          endIconName="linkIcon"
        />
      </div>
      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "32px",
          marginTop: "48px",
          lineHeightStep: "24px",
        }}>
        <>{props.language("email_no_user_invite_steps_intro")}</>
      </p>

      {!props.isCalcomMember && (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <EmailStep
            translationString={props.language("email_no_user_step_one")}
            iconsrc={
              IS_PRODUCTION
                ? WEBAPP_URL + "/emails/choose-username@2x.png"
                : "http://localhost:3000/emails/choose-username@2x.png"
            }
          />
          <EmailStep
            translationString={props.language("email_no_user_step_two")}
            iconsrc={
              IS_PRODUCTION
                ? WEBAPP_URL + "/emails/calendar@2x.png"
                : "http://localhost:3000/emails/calendar@2x.png"
            }
          />
          <EmailStep
            translationString={props.language("email_no_user_step_three")}
            iconsrc={
              IS_PRODUCTION
                ? WEBAPP_URL + "/emails/clock@2x.png"
                : "http://localhost:3000/emails/clock@2x.png"
            }
          />
          <EmailStep
            translationString={props.language("email_no_user_step_four", { teamName: props.teamName })}
            iconsrc={
              IS_PRODUCTION
                ? WEBAPP_URL + "/emails/user-check@2x.png"
                : "http://localhost:3000/emails/user-check@2x.png"
            }
          />
        </div>
      )}

      <div className="">
        <p
          style={{
            fontWeight: 400,
            lineHeight: "24px",
            marginBottom: "32px",
            marginTop: "32px",
            lineHeightStep: "24px",
          }}>
          <>{props.language("email_no_user_signoff", { appName: APP_NAME })}</>
        </p>
      </div>

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

const EmailStep = (props: { translationString: string; iconsrc: string }) => {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          backgroundColor: "#E5E7EB",
          borderRadius: "48px",
          height: "48px",
          width: "48px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "white",
          marginRight: "16px",
        }}>
        <img src={props.iconsrc} alt="#" style={{ height: "24px", width: "auto" }} />
      </div>
      <p
        style={{
          fontStyle: "normal",
          fontWeight: 500,
          fontSize: "18px",
          lineHeight: "20px",
          color: "#black",
        }}>
        <>{props.translationString}</>
      </p>
    </div>
  );
};
