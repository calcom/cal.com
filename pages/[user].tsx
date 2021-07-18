import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import prisma, { whereAndSelect } from "@lib/prisma";
import Avatar from "../components/Avatar";
import Theme from "@components/Theme";

export default function User(props): User {
  const { isReady } = Theme(props.user.theme);

  const eventTypes = props.eventTypes.map((type) => (
    <li
      key={type.id}
      className="dark:bg-gray-800 dark:opacity-90 dark:hover:opacity-100 dark:hover:bg-gray-800 bg-white hover:bg-gray-50 ">
      <Link href={`/${props.user.username}/${type.slug}`}>
        <a className="block px-6 py-4">
          <div
            className="inline-block w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: getRandomColorCode() }}></div>
          <h2 className="inline-block font-medium dark:text-white">{type.title}</h2>
          <p className="inline-block text-gray-400 dark:text-gray-100 ml-2">{type.description}</p>
        </a>
      </Link>
    </li>
  ));
  return (
    isReady && (
      <div>
        <Head>
          <title>{props.user.name || props.user.username} | Calendso</title>
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-2xl mx-auto my-24">
          <div className="mb-8 text-center">
            <Avatar user={props.user} className="mx-auto w-24 h-24 rounded-full mb-4" />
            <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-1">
              {props.user.name || props.user.username}
            </h1>
            <p className="text-gray-600 dark:text-white">{props.user.bio}</p>
          </div>
          <div className="shadow overflow-hidden rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-gray-900">{eventTypes}</ul>
            {eventTypes.length == 0 && (
              <div className="p-8 text-center text-gray-400 dark:text-white">
                <h2 className="font-semibold text-3xl text-gray-600">Uh oh!</h2>
                <p className="max-w-md mx-auto">This user hasn&apos;t set up any event types yet.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await whereAndSelect(
    prisma.user.findFirst,
    {
      username: context.query.user.toLowerCase(),
    },
    ["id", "username", "email", "name", "bio", "avatar", "theme"]
  );
  if (!user) {
    return {
      notFound: true,
    };
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId: user.id,
      hidden: false,
    },
    select: {
      slug: true,
      title: true,
      description: true,
    },
  });

  return {
    props: {
      user,
      eventTypes,
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
