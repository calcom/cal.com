import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import OrgAddNewTeamMembers, { LayoutWrapper } from "~/settings/organizations/[id]/onboard-members-view";

const Page = () => {
  const { t } = useLocale();

  return (
    <>
      <Meta
        title={t("invite_organization_admins")}
        description={t("invite_organization_admins_description")}
      />
      <OrgAddNewTeamMembers />
    </>
  );
};

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export default Page;
export { getServerSideProps };
