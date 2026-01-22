import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import ImpersonationAuditView from "~/settings/admin/impersonation-audit-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("audit_log"),
    (t) => t("impersonation_audit_log_description"),
    undefined,
    undefined,
    "/settings/admin/impersonation"
  );

const Page = async () => {
  const t = await getTranslate();
  return (
    <SettingsHeader
      title={t("audit_log")}
      description={t("impersonation_audit_log_description")}
    >
      <ImpersonationAuditView />
    </SettingsHeader>
  );
};

export default Page;
