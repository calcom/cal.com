import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata } from "app/_utils";
import { getTranslate } from "app/_utils";
import SelfHostedView from "~/settings/admin/self-hosted/self-hosted-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("self_hosted_deployments"),
    (t) => t("self_hosted_deployments_description"),
    undefined,
    undefined,
    "/settings/admin/self-hosted"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader
      title={t("self_hosted_deployments")}
      description={t("self_hosted_deployments_description")}
    >
      <LicenseRequired>
        <SelfHostedView />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
