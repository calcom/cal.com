import { getTranslate } from "app/_utils";

import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";

import { DubReferralsPage } from "./DubReferralsPage";

// Export the appropriate component based on the feature flag
export default async function ReferralsPage() {
  const t = await getTranslate();
  return IS_DUB_REFERRALS_ENABLED ? (
    <DubReferralsPage />
  ) : (
    <div className="mx-auto max-w-4xl p-8 text-center">
      <h2 className="mb-4 text-xl font-semibold">{t("referral_program")}</h2>
      <p>{t("dub_disabled_error_message")}</p>
    </div>
  );
}
