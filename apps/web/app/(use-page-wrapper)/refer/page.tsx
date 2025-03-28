import { getTranslate } from "app/_utils";
import type { Metadata } from "next";

import Shell from "@calcom/features/shell/Shell";
import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";

import { DubReferralsPage } from "./DubReferralsPage";

export const metadata: Metadata = {
  title: "Referral Program | Cal.com",
  description: "Earn commissions by referring others to Cal.com. Share your link and start earning today!",
};

// Export the appropriate component based on the feature flag
export default async function ReferralsPage() {
  const t = await getTranslate();

  return (
    <Shell withoutMain={true}>
      {IS_DUB_REFERRALS_ENABLED ? (
        <div className="-m-4 sm:-mt-6 md:-mt-4">
          <DubReferralsPage />
        </div>
      ) : (
        <div className="mx-auto max-w-4xl p-8 text-center">
          <h2 className="mb-4 text-xl font-semibold">{t("referral_program")}</h2>
          <p>{t("dub_disabled_error_message")}</p>
        </div>
      )}
    </Shell>
  );
}
