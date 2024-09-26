import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import EnterprisePage from "@components/EnterprisePage";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_your_org"),
    (t) => t("create_your_org_description")
  );

export default WithLayout({ getLayout, Page: EnterprisePage })<"P">;
