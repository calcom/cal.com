import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import { getServerSideProps } from "@lib/settings/organizations/new/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

import CreateNewOrganizationPage, { LayoutWrapper } from "~/settings/platform/new/create-new-view";

const Page = () => {
  const { t } = useLocale();
  return (
    <LicenseRequired>
      <Meta
        title={t("set_up_your_platform_organization")}
        description={t("platform_organization_description")}
      />
      <CreateNewOrganizationPage />
    </LicenseRequired>
  );
};

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export default Page;

export { getServerSideProps };
