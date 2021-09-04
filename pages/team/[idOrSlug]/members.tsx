import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";

import Theme from "@components/Theme";
import { getTeam } from "@lib/teams/getTeam";
import Team from "@components/team/screens/Team";

const TeamMembersPage: InferGetServerSidePropsType<typeof getServerSideProps> = ({ team }) => {
  const { isReady } = Theme();
  return (
    isReady && (
      <div>
        <Head>
          <title>{team.name} | Calendso</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="mx-auto py-24 px-4">
          <Team team={team} />
        </main>
      </div>
    )
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const teamIdOrSlug = Array.isArray(context.query?.idOrSlug)
    ? context.query.idOrSlug.pop()
    : context.query.idOrSlug;

  const team = await getTeam(teamIdOrSlug);

  if (!team) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      team,
    },
  };
};

export default TeamMembersPage;
