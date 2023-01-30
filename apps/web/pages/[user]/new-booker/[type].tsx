import { GetStaticPaths, GetStaticPropsContext } from "next";
import { z } from "zod";

import { Booker } from "@calcom/atoms";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import prisma from "@calcom/prisma";

import { inferSSRProps } from "@lib/types/inferSSRProps";

type PageProps = inferSSRProps<typeof getStaticProps>;

export default function Type({ slug, user }: PageProps) {
  // @TODO: Add gates
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Booker username={user} eventSlug={slug} />
    </main>
  );
}

Type.isThemeSupported = true;

async function getDynamicGroupPageProps(context: GetStaticPropsContext) {
  const { user, type: slug } = paramsSchema.parse(context.params);
  const { ssgInit } = await import("@server/lib/ssg");
  const ssg = await ssgInit(context);
  const usernameList = getUsernameList(user);

  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernameList,
      },
    },
    select: {
      allowDynamicBooking: true,
    },
  });

  if (!users.length) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      user,
      slug,
      away: false,
      trpcState: ssg.dehydrate(),
    },
    revalidate: 10,
  };
}

async function getUserPageProps(context: GetStaticPropsContext) {
  const { user: username, type: slug } = paramsSchema.parse(context.params);
  const { ssgInit } = await import("@server/lib/ssg");
  const ssg = await ssgInit(context);
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      away: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      away: user?.away,
      user: username,
      slug,
      trpcState: ssg.dehydrate(),
    },
    revalidate: 10,
  };
}

const paramsSchema = z.object({ type: z.string(), user: z.string() });

// Booker page fetches a tiny bit of data server side, to determine early
// whether the page should show an away state or dynamic booking not allowed.
export const getStaticProps = async (context: GetStaticPropsContext) => {
  const { user } = paramsSchema.parse(context.params);
  const isDynamicGroup = user.includes("+");

  return isDynamicGroup ? await getDynamicGroupPageProps(context) : await getUserPageProps(context);
};

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: "blocking" };
};
