import type { TFunction } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { BaseEmailHtml, CallToAction } from "../components";

export type OrganizationJoinRequestEmailInput = {
  language: TFunction;
  to: {
    email: string;
  };
  userFullName: string;
  userEmail: string;
  orgName: string;
  orgId: number;
};

export const OrganizationJoinRequestEmail = (
  props: OrganizationJoinRequestEmailInput & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const manageMembersLink = `${WEBAPP_URL}/settings/organizations/members`;

  return (
    <BaseEmailHtml subject={props.language("org_join_request_email_subject", { orgName: props.orgName })}>
      <p
        style={{
          fontWeight: 600,
          fontSize: "32px",
          lineHeight: "38px",
        }}>
        <>{props.language("org_join_request_email_heading")}</>
      </p>
      <p style={{ fontWeight: 400, fontSize: "16px", lineHeight: "24px" }}>
        {props.language("org_join_request_email_body", {
          fullName: props.userFullName,
          email: props.userEmail,
        })}
      </p>
      <p style={{ fontWeight: 400, fontSize: "16px", lineHeight: "24px" }}>
        {props.language("org_join_request_email_manage_prompt")}
      </p>
      <div style={{ marginTop: "3rem", marginBottom: "0.75rem" }}>
        <CallToAction
          label={props.language("org_join_request_email_cta")}
          href={manageMembersLink}
          endIconName="linkIcon"
        />
      </div>
    </BaseEmailHtml>
  );
};
