import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import AboutOrganizationForm, { LayoutWrapper } from "~/settings/organizations/[id]/about-view";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("about_your_organization")} description={t("about_your_organization_description")} />
      <AboutOrganizationForm />
    </>
  );
};

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps };
