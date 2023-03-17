import type { TFunction } from "next-i18next";

import { CAL_URL } from "@calcom/lib/constants";

import { BaseEmailHtml, CallToAction } from "../components";

export const SlugReplacementEmail = (
  props: {
    slug: string;
    t: TFunction;
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const { slug, t } = props;

  return (
    <BaseEmailHtml
      subject={t("email_subject_slug_replacement", { slug: slug })}
      callToAction={<CallToAction label={t("review_my_event_types")} href={`${CAL_URL}/event-types`} />}
      headerType="teamCircle">
      <>
        <p style={{ lineHeight: "24px" }}>
          <>{t("email_body_slug_replacement_notice", { slug })}</>
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>{t("email_body_slug_replacement_suggestion")}</>
        </p>
      </>
    </BaseEmailHtml>
  );
};
