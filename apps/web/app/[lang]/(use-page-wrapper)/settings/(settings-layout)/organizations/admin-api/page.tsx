import type { PageProps } from "app/_types";
import { getTranslate, _generateMetadata } from "app/_utils";

import { AdminAPIView } from "@calcom/features/ee/organizations/pages/settings/admin-api";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(`${t("admin")} ${t("api_reference")}`, t("leverage_our_api"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);

  return (
    <SettingsHeader
      title={`${t("admin")} ${t("api_reference")}`}
      description={t("leverage_our_api")}
      borderInShellHeader={false}>
      <AdminAPIView />
    </SettingsHeader>
  );
};

export default Page;
