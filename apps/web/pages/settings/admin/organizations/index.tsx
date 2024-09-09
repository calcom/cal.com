import NoSSR from "@calcom/core/components/NoSSR";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import AdminOrgTable from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgPage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

const Page = () => {
  const { t } = useLocale();
  return (
    <div>
      <LicenseRequired>
        <Meta title={t("organizations")} description={t("orgs_page_description")} />
        <NoSSR>
          <AdminOrgTable />
        </NoSSR>
      </LicenseRequired>
    </div>
  );
};
Page.PageWrapper = PageWrapper;
Page.getLayout = getLayout;

export default Page;
