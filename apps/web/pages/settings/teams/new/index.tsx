import Head from "next/head";

import { CreateANewTeamForm } from "@calcom/features/ee/teams/components";
import { getWizardLayout as getLayout } from "@calcom/ui";

const CreateNewTeamPage = () => {
  return (
    <>
      <Head>
        <title>Create a new Team</title>
        <meta name="description" content="Create a new team to ease your organisational booking" />
      </Head>
      <CreateANewTeamForm />
    </>
  );
};

CreateNewTeamPage.getLayout = getLayout;

export default CreateNewTeamPage;
