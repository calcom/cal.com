import { _generateMetadata } from "app/_utils";

import Page from "@calcom/features/ee/teams/pages/team-profile-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("sms_credits"),
    (t) => t("manage_sms_credit_allocation")
  );

export default Page;
