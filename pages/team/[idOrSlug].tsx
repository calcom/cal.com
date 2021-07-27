import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Avatar from "@components/Avatar";
import Theme from "@components/Theme";
import Text from "@components/ui/Text";
import { getTeam } from "../../lib/getTeam";

export default function Page(props) {
  const { isReady } = Theme();

  const Members = ({ members }) => {
    if (!members || members.length === 0) {
      return null;
    }

    return (
      <section className="bg-white dark:bg-opacity-5 text-black dark:text-white grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12 p-8">
        {members.map((member) => {
          return (
            <Link key={member.id} href={`/${member.user.username}`}>
              <div className="hover:cursor-pointer flex flex-col justify-center items-center text-center">
                <Avatar user={member.user} className="mx-auto w-20 h-20 rounded-full mb-4" />
                <Text variant="title" className="text-gray-800 dark:text-white mb-1">
                  {member.user.name}
                </Text>
                <p className="text-gray-600 dark:text-white">{member.user.bio}</p>
              </div>
            </Link>
          );
        })}
      </section>
    );
  };

  return (
    isReady && (
      <div>
        <Head>
          <title>{props.team.name} | Calendso</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-2xl mx-auto my-24">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-1">{props.team.name}</h1>
          </div>
          <Members members={props.team.members} />
        </main>
      </div>
    )
  );
}

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

// Auxiliary methods
export function getRandomColorCode(): string {
  let color = "#";
  for (let idx = 0; idx < 6; idx++) {
    color += Math.floor(Math.random() * 10);
  }
  return color;
}
