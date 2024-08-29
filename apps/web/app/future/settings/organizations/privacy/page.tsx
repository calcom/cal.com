import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import PrivacyView from "@calcom/features/ee/organizations/pages/settings/privacy";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("privacy"),
    (t) => t("privacy_organization_description")
  );

export default WithLayout({ Page: PrivacyView, getLayout });
