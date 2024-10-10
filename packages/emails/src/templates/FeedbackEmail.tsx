import type { TFunction } from "next-i18next";

import type { Feedback } from "../../templates/feedback-email";
import { BaseEmailHtml } from "../components";
import { Info } from "../components/Info";

export const FeedbackEmail = (
  props: {
    feedback: Feedback;
    t: TFunction;
  } & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  const { feedback, t } = props;
  return (
    <BaseEmailHtml subject="Feedback" title="Feedback" locale={props.locale || "en"}>
      <Info label={t("user")} description={feedback.username || ""} withSpacer />
      <Info label={t("email")} description={feedback.email || ""} withSpacer />
      <Info label={t("rating")} description={feedback.rating?.toString() || ""} withSpacer />
      <Info label={t("comment")} description={feedback.comment || ""} withSpacer />
    </BaseEmailHtml>
  );
};

export default FeedbackEmail;
