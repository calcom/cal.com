import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import Page from "@calcom/features/ee/organizations/pages/settings/appearance";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_org_description")
  );

export default WithLayout({ Page });
