import Head from "next/head";

import AddNewTeamMembers from "@calcom/features/ee/teams/components/v2/AddNewTeamMembers";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getLayout } from "@calcom/ui/v2/core/layouts/WizardLayout";

const CreateNewTeamPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Head>
        <title>{t("add_team_members")}</title>
        <meta name="description" content={t("add_team_members_description")} />
      </Head>
      <AddNewTeamMembers />
    </>
  );
};

CreateNewTeamPage.getLayout = getLayout;

export default CreateNewTeamPage;
