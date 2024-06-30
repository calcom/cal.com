import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";

import { APP_NAME, WEBAPP_URL, IS_PRODUCTION } from "@calcom/lib/constants";

import { getSubject, getTypeOfInvite } from "../../templates/team-invite-email";
import { V2BaseEmailHtml, CallToAction } from "../components";

type TeamInvite = {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
  isCalcomMember: boolean;
  isAutoJoin: boolean;
  isOrg: boolean;
  parentTeamName: string | undefined;
  isExistingUserMovedToOrg: boolean;
  prevLink: string | null;
  newLink: string | null;
};

export const TeamInviteEmail = (
  props: TeamInvite & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  const typeOfInvite = getTypeOfInvite(props);

  const heading = getHeading();
  const content = getContent();
  return (
    <V2BaseEmailHtml subject={getSubject(props)}>
      <p style={{ fontSize: "24px", marginBottom: "16px", textAlign: "center" }}>
        <>{heading}</>
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
        <>{content}</>
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CallToAction
          label={props.language(
            props.isCalcomMember ? (props.isAutoJoin ? "login" : "email_user_cta") : "create_your_account"
          )}
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
        }}
      />

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

  function getHeading() {
    const autoJoinType = props.isAutoJoin ? "added" : "invited";
    const variables = {
      appName: APP_NAME,
      parentTeamName: props.parentTeamName,
    };

    if (typeOfInvite === "TO_ORG") {
      return props.language(`email_team_invite|heading|${autoJoinType}_to_org`, variables);
    }

    if (typeOfInvite === "TO_SUBTEAM") {
      return props.language(`email_team_invite|heading|${autoJoinType}_to_subteam`, variables);
    }

    return props.language(`email_team_invite|heading|invited_to_regular_team`, variables);
  }

  function getContent() {
    const autoJoinType = props.isAutoJoin ? "added" : "invited";

    const variables = {
      invitedBy: props.from.toString(),
      appName: APP_NAME,
      teamName: props.teamName,
      parentTeamName: props.parentTeamName,
      prevLink: props.prevLink,
      newLink: props.newLink,
      orgName: props.parentTeamName ?? props.isOrg ? props.teamName : "",
      prevLinkWithoutProtocol: props.prevLink?.replace(/https?:\/\//, ""),
      newLinkWithoutProtocol: props.newLink?.replace(/https?:\/\//, ""),
    };

    const {
      prevLink,
      newLink,
      teamName,
      invitedBy,
      appName,
      parentTeamName,
      prevLinkWithoutProtocol,
      newLinkWithoutProtocol,
    } = variables;
    if (typeOfInvite === "TO_ORG") {
      if (props.isExistingUserMovedToOrg) {
        return (
          <>
            {autoJoinType == "added" ? (
              <>
                <Trans i18nKey="email_team_invite|content|added_to_org">
                  {invitedBy} has added you to the <strong>{teamName}</strong> organization.
                </Trans>{" "}
                <Trans
                  i18nKey="email_team_invite|content_addition|existing_user_added"
                  values={{ prevLink: props.prevLink, newLink: props.newLink, teamName: props.teamName }}>
                  Your link has been changed from <a href={prevLink ?? ""}>{prevLinkWithoutProtocol}</a> to{" "}
                  <a href={newLink ?? ""}>{newLinkWithoutProtocol}</a> but don&apos;t worry, all previous
                  links still work and redirect appropriately.
                  <br />
                  <br />
                  Please note: All of your personal event types have been moved into the{" "}
                  <strong>{teamName}</strong> organisation, which may also include potential personal link.
                  <br />
                  <br />
                  Please log in and make sure you have no private events on your new organisational account.
                  <br />
                  <br />
                  For personal events we recommend creating a new account with a personal email address.
                  <br />
                  <br />
                  Enjoy your new clean link:{" "}
                  <a href={`${newLink}?orgRedirection=true`}>{newLinkWithoutProtocol}</a>
                </Trans>
              </>
            ) : (
              <>
                <Trans i18nKey="email_team_invite|content|invited_to_org">
                  {invitedBy} has invited you to join the <strong>{teamName}</strong> organization.
                </Trans>{" "}
                <Trans
                  i18nKey="existing_user_added_link_will_change"
                  values={{ prevLink: props.prevLink, newLink: props.newLink, teamName: props.teamName }}>
                  On accepting the invite, your link will change to your organization domain but don&apos;t
                  worry, all previous links will still work and redirect appropriately.
                  <br />
                  <br />
                  Please note: All of your personal event types will be moved into the{" "}
                  <strong>{teamName}</strong> organisation, which may also include potential personal link.
                  <br />
                  <br />
                  For personal events we recommend creating a new account with a personal email address.
                </Trans>
              </>
            )}
          </>
        );
      }
      return (
        <>
          {autoJoinType === "added" ? (
            <Trans i18nKey="email_team_invite|content|added_to_org">
              {invitedBy} has added you to the <strong>{teamName}</strong> organization.
            </Trans>
          ) : (
            <Trans i18nKey="email_team_invite|content|invited_to_org">
              {invitedBy} has invited you to join the <strong>{teamName}</strong> organization.
            </Trans>
          )}{" "}
          <Trans>
            {appName} is the event-juggling scheduler that enables you and your team to schedule meetings
            without the email tennis.
          </Trans>
        </>
      );
    }

    if (typeOfInvite === "TO_SUBTEAM") {
      return (
        <>
          {autoJoinType === "added" ? (
            <Trans i18nKey="email_team_invite|content|added_to_subteam">
              {invitedBy} has added you to the team <strong>{teamName}</strong> in their organization{" "}
              <strong>{parentTeamName}</strong>.
            </Trans>
          ) : (
            <Trans i18nKey="email_team_invite|content|invited_to_subteam">
              {invitedBy} has invited you to the team <strong>{teamName}</strong> in their organization{" "}
              <strong>{parentTeamName}</strong>.
            </Trans>
          )}{" "}
          <Trans>
            {appName} is the event-juggling scheduler that enables you and your team to schedule meetings
            without the email tennis.
          </Trans>
        </>
      );
    }
    // Regular team doesn't support auto-join. So, they have to be invited always
    return props.language(`email_team_invite|content|invited_to_regular_team`, variables);
  }
};
