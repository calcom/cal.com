import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";

import { BaseEmailHtml, CallToAction } from "../components";

export type OrganizationAdminNoSlotsEmailInput = {
  language: TFunction;
  to: {
    email: string;
  };
  user: string;
  slug: string;
  startTime: string;
  editLink: string;
};

export const OrganizationAdminNoSlotsEmail = (
  props: OrganizationAdminNoSlotsEmailInput & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  return (
    <BaseEmailHtml subject={`No availability found for ${props.user}`}>
      <p
        style={{
          fontWeight: 600,
          fontSize: "32px",
          lineHeight: "38px",
        }}>
        <>{props.language("org_admin_no_slots|heading", { name: props.user })}</>
      </p>
      <p style={{ fontWeight: 400, fontSize: "16px", lineHeight: "24px" }}>
        <Trans i18nKey="org_admin_no_slots|content" values={{ username: props.user, slug: props.slug }}>
          Hello Organization Admins,
          <br />
          <br />
          Please note: It has been brought to our attention that {props.user} has not had any availability
          when a user has visited {props.user}/{props.slug}
          <br />
          <br />
          There’s a few reasons why this could be happening
          <br />
          The user does not have any calendars connected
          <br />
          Their schedules attached to this event are not enabled
        </Trans>
      </p>
      <div style={{ marginTop: "3rem", marginBottom: "0.75rem" }}>
        <CallToAction
          label={props.language("org_admin_no_slots|cta")}
          href={props.editLink}
          endIconName="linkIcon"
        />
      </div>
    </BaseEmailHtml>
  );
};
