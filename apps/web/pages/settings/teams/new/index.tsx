import Head from "next/head";

import { CreateANewTeamForm } from "@calcom/features/ee/teams/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { getLayout } from "@components/layouts/WizardLayout";

const CreateNewTeamPage = () => {
  const { t } = useLocale();
  return (
    <>
      <Head>
        <title>{t("create_new_team")}</title>
        <meta name="description" content={t("create_new_team_description")} />
      </Head>
      <CreateANewTeamForm />
    </>
  );
};

CreateNewTeamPage.getLayout = getLayout;

export default CreateNewTeamPage;
