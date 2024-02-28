import { APP_NAME, WEBAPP_URL, IS_PRODUCTION } from "@calcom/lib/constants";

import type { OrganizationCreation } from "../../templates/organization-creation-email";
import { V2BaseEmailHtml } from "../components";

export const OrganizationCreationEmail = (
  props: OrganizationCreation & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  return (
    <V2BaseEmailHtml subject={props.language(`email_organization_created_subject`)}>
      <p style={{ fontSize: "24px", marginBottom: "16px", textAlign: "center" }}>
        <>{props.language(`You have created ${props.orgName} organization.`)}</>
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
            ? `${WEBAPP_URL}/emails/calendar-email-hero.png`
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
        <>
          {props.language(
            `You have been added as an owner of the organization. Your link has been changed from cal.com/${props.ownerOldUsername} to ${props.orgDomain}/${props.ownerNewUsername} but don't worry, all previous links still work and redirect appropriately.`,
            {
              invitedBy: props.from.toString(),
              appName: APP_NAME,
            }
          )}
        </>
      </p>
      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "32px",
          marginTop: "48px",
          lineHeightStep: "24px",
        }}>
        Please note: All of your personal event types have been moved into the ${props.orgName} organisation,
        which may also include potential personal link. Please log in and make sure you have no private events
        on your new organisational account. For personal events we recommend creating a new cal.com account
        with a personal email address. Enjoy your new clean link!
      </p>

      <div className="">
        <p
          style={{
            fontWeight: 400,
            lineHeight: "24px",
            marginBottom: "32px",
            marginTop: "32px",
            lineHeightStep: "24px",
          }}>
          <>
            {props.language("email_no_user_signoff", {
              appName: APP_NAME,
            })}
          </>
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
