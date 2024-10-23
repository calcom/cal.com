import { getServerSideProps } from "@calcom/features/ee/organizations/pages/organization";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import AddNewTeamsForm, { LayoutWrapper } from "~/settings/organizations/[id]/add-teams-view";

const Page = () => {
  const { t } = useLocale();
  return (
    <>
      <Meta title={t("create_your_teams")} description={t("create_your_teams_description")} />
      <AddNewTeamsForm />
    </>
  );
};

Page.getLayout = LayoutWrapper;
Page.PageWrapper = PageWrapper;

export default Page;

export { getServerSideProps };
