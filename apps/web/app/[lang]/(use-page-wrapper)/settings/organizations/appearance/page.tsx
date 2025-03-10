import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import Page from "@calcom/features/ee/organizations/pages/settings/appearance";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("appearance"), t("appearance_org_description"));
};

const ServerPageWrapper = () => {
  return <Page />;
};

export default ServerPageWrapper;
