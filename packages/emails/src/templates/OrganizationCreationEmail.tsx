import { Trans } from "next-i18next";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";

import type { OrganizationCreation } from "../../templates/organization-creation-email";
import { V2BaseEmailHtml } from "../components";

export const OrganizationCreationEmail = (
  props: OrganizationCreation & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  const { prevLink, newLink, orgName: teamName } = props;
  const prevLinkWithoutProtocol = props.prevLink?.replace(/https?:\/\//, "");
  const newLinkWithoutProtocol = props.newLink?.replace(/https?:\/\//, "");
  const isNewUser = props.ownerOldUsername === null;
  return (
    <V2BaseEmailHtml subject={props.language(`email_organization_created|subject`)}>
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
        src={`${WEBAPP_URL}/emails/calendar-email-hero.png`}
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
        You have been added as an owner of the organization. To publish your new organization, visit{" "}
        <a href={`${WEBAPP_URL}/upgrade`}>{WEBAPP_URL}/upgrade</a>
      </p>
      <p
        data-testid="organization-link-info"
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "32px",
          marginTop: "48px",
          lineHeightStep: "24px",
        }}>
        {isNewUser ? (
          <Trans>
            Enjoy your new organization link: <a href={`${newLink}`}>{newLinkWithoutProtocol}</a>
          </Trans>
        ) : (
          <Trans i18nKey="email|existing_user_added_link_changed">
            Your link has been changed from <a href={prevLink ?? ""}>{prevLinkWithoutProtocol}</a> to{" "}
            <a href={newLink ?? ""}>{newLinkWithoutProtocol}</a> but don&apos;t worry, all previous links
            still work and redirect appropriately.
            <br />
            <br />
            Please note: All of your personal event types have been moved into the <strong>
              {teamName}
            </strong>{" "}
            organisation, which may also include potential personal link.
            <br />
            <br />
            Please log in and make sure you have no private events on your new organisational account.
            <br />
            <br />
            For personal events we recommend creating a new account with a personal email address.
            <br />
            <br />
            Enjoy your new clean link: <a href={`${newLink}?orgRedirection=true`}>{newLinkWithoutProtocol}</a>
          </Trans>
        )}
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
