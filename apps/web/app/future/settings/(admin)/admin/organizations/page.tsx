import { _generateMetadata } from "app/_utils";
import { getFixedT } from "app/_utils";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { AUTH_OPTIONS } from "@calcom/feature-auth/lib/next-auth-options";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import AdminOrgTable from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { TeamRepository } from "@calcom/lib/server/repository/team";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organizations"),
    (t) => t("orgs_page_description")
  );

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);

  const t = await getFixedT(session?.user.locale || "en");
  try {
    const allOrgs = await TeamRepository.getAllOrgs();
    return (
      <SettingsHeader title={t("organizations")} description={t("orgs_page_description")}>
        <LicenseRequired>
          <AdminOrgTable ssrProps={{ allOrgs }} />
        </LicenseRequired>
      </SettingsHeader>
    );
  } catch (e) {
    notFound();
  }
};

export default Page;
