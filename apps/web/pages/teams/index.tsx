import { GetServerSidePropsContext } from "next";

import { TeamsListing } from "@calcom/features/ee/teams/components";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon, Shell } from "@calcom/ui";

import { ssrInit } from "@server/lib/ssr";

function Teams() {
  const { t } = useLocale();
  return (
    <Shell
      heading={t("teams")}
      subtitle={t("create_manage_teams_collaborative")}
      CTA={
        <Button type="button" href={`${WEBAPP_URL}/settings/teams/new`}>
          <Icon.FiPlus className="inline-block h-3.5 w-3.5 text-white group-hover:text-black ltr:mr-2 rtl:ml-2" />
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
