import Head from "next/head";

import CreateNewTeam from "@calcom/features/ee/teams/components/v2/CreateNewTeam";
import { getLayout } from "@calcom/ui/v2/core/layouts/WizardLayout";

const CreateNewTeamPage = () => {
  return (
    <>
      <Head>
        <title>Create a new Team</title>
        <meta name="description" content="Create a new team to ease your organisational booking" />
      </Head>
      <CreateNewTeam />
    </>
  );
};

CreateNewTeamPage.getLayout = getLayout;

export default CreateNewTeamPage;
