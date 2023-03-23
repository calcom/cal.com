import { GetServerSidePropsContext } from "next";

import { TeamsListing } from "@calcom/features/ee/teams/components";
import Shell from "@calcom/features/shell/Shell";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { FiPlus } from "@calcom/ui/components/icon";

import { ssrInit } from "@server/lib/ssr";

function Teams() {
  const { t } = useLocale();
  return (
    <Shell
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}
      CTA={
        <Button
          variant="fab"
          StartIcon={FiPlus}
          type="button"
          href={`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`}>
          {t("new")}
        </Button>
      }>
      <TeamsListing />
    </Shell>
  );
}

Teams.requiresLicense = false;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default Teams;
