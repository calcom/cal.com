import Loader from "@components/Loader";
import { useRouter } from "next/router";
import { getTeamFromContext } from "../lib/getTeam";
import Head from "next/head";
import Team from "@components/team/screens/Team";

function RedirectPage(props) {
  const router = useRouter();
  if (props.team) {
    return (
      <div>
        <Head>
          <title>{props.team.name} | Calendso</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-2xl mx-auto my-24">
          <Team team={props.team} />
        </main>
      </div>
    );
  }

  if (typeof window !== "undefined") {
    router.push("/event-types");
    return;
  }

  return <Loader />;
}

export async function getServerSideProps(context) {
  const team = await getTeamFromContext(context);

  if (team) {
    return {
      props: {
        team,
      },
    };
  }

  if (context.res) {
    context.res.writeHead(302, { Location: "/event-types" });
    context.res.end();
  }
  return {};
}

export default RedirectPage;
