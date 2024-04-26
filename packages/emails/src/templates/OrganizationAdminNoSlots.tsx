import type { TFunction } from "next-i18next";

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
    <BaseEmailHtml subject={props.language('"org_admin_no_slots|subject', { name: props.user })}>
      <p
        style={{
          fontWeight: 600,
          fontSize: "32px",
          lineHeight: "38px",
        }}>
        <>{props.language("org_admin_no_slots|subject", { name: props.user })}</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>
          {props.language("org_admin_no_slots|content", {
            username: props.user,
            period: "XXX",
            eventType: props.slug,
          })}
        </>
      </p>
      <CallToAction
        label={props.language("email_user_cta", {
          entity: "organization",
        })}
        href={props.editLink}
        endIconName="linkIcon"
      />
    </BaseEmailHtml>
  );
};
