import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { TeamsListing } from "@calcom/features/ee/teams/components";
import Shell from "@calcom/features/shell/Shell";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

import { ssrInit } from "@server/lib/ssr";

function Teams() {
  const { t } = useLocale();
  const [user] = trpc.viewer.me.useSuspenseQuery();

  return (
    <Shell
      heading={t("teams")}
      hideHeadingOnMobile
      subtitle={t("create_manage_teams_collaborative")}
      CTA={
        !user.organizationId || user.organization.isOrgAdmin ? (
          <Button
            variant="fab"
            StartIcon={Plus}
            type="button"
            href={`${WEBAPP_URL}/settings/teams/new?returnTo=${WEBAPP_URL}/teams`}>
            {t("new")}
          </Button>
        ) : undefined
      }>
      <TeamsListing />
    </Shell>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  await ssr.viewer.me.prefetch();

  return { props: { trpcState: ssr.dehydrate(), ...(await serverSideTranslations("en", ["common"])) } };
};

Teams.requiresLicense = false;
Teams.PageWrapper = PageWrapper;

export default Teams;
