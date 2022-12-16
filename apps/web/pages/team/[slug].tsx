import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { PublicPage } from "pages/[user]";
import React, { useEffect } from "react";

import { CAL_URL } from "@calcom/lib/constants";
import useTheme from "@calcom/lib/hooks/useTheme";
import { getTeamWithMembers } from "@calcom/lib/server/queries/teams";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";

import useMeQuery from "@lib/hooks/useMeQuery";
import { inferSSRProps } from "@lib/types/inferSSRProps";

export type TeamPageProps = inferSSRProps<typeof getServerSideProps>;
function TeamPage({ team }: TeamPageProps) {
  const query = useMeQuery();
  const user = query.data;
  useTheme(user?.theme || "light");
  const telemetry = useTelemetry();
  const router = useRouter();

  useEffect(() => {
    telemetry.event(
      telemetryEventTypes.pageView,
      collectPageParameters("/team/[slug]", { isTeamBooking: true })
    );
  }, [telemetry, router.asPath]);

  return <PublicPage type="team" teamProps={team} />;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const slug = Array.isArray(context.query?.slug) ? context.query.slug.pop() : context.query.slug;
  const team = await getTeamWithMembers(undefined, slug);

  if (!team) return { notFound: true } as { notFound: true };

  const members = team.members;
  team.members = members ?? [];
  team.eventTypes = team.eventTypes.map((type) => ({
    ...type,
    users: type.users.map((user) => ({
      ...user,
      avatar: CAL_URL + "/" + user.username + "/avatar.png",
    })),
  }));

  return {
    props: {
      team,
    },
  };
};

export default TeamPage;
TeamPage.isThemeSupported = true;
