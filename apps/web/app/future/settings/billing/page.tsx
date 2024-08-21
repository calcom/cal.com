import Page from "@pages/settings/billing/index";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayoutAppDir";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("billing"),
    (t) => t("manage_billing_description")
  );

export default WithLayout({ getLayout, Page });
