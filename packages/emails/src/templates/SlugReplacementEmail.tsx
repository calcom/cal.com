import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";

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
      headerType="teamCircle"
      title={t("event_replaced_notice")}>
      <>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <Trans i18nKey="email_body_slug_replacement_notice" values={{ slug }} />
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>{t("email_body_slug_replacement_suggestion")}</>
        </p>
      </>
    </BaseEmailHtml>
  );
};
