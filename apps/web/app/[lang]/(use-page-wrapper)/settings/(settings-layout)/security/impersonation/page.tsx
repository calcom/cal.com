import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import ProfileImpersonationViewWrapper from "~/settings/security/impersonation-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("impersonation"), t("impersonation_description"));
};

const Page = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);

  return (
    <SettingsHeader
      title={t("impersonation")}
      description={t("impersonation_description")}
      borderInShellHeader={true}>
      <ProfileImpersonationViewWrapper />
    </SettingsHeader>
  );
};

export default Page;
