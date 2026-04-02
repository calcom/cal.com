import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import ComplianceView from "~/settings/security/compliance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("compliance"),
    (t) => t("compliance_description"),
    undefined,
    undefined,
    "/settings/security/compliance"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("compliance")}
      description={t("compliance_description")}
      borderInShellHeader={true}>
      <ComplianceView />
    </SettingsHeader>
  );
};

export default Page;
