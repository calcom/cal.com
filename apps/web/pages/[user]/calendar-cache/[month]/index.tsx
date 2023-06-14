/**
 * This page is empty for the user, it is used only to take advantage of the
 * caching system that NextJS uses SSG pages.
 */
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { z } from "zod";

import getCalendarsEvents from "@calcom/core/getCalendarsEvents";
import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

const paramsSchema = z.object({ user: z.string(), month: z.string(), orgSlug: z.string().optional() });
export const getStaticProps: GetStaticProps<
  { results: Awaited<ReturnType<typeof getCalendarsEvents>> },
  { user: string }
> = async (context) => {
  const { user: username, month, orgSlug = null } = paramsSchema.parse(context.params);
  console.log(orgSlug);
  const userWithCredentials = await prisma.user.findFirst({
    where: {
      username,
      ...(orgSlug ? { organization: { slug: orgSlug } } : { organizationId: null }),
    },
    select: {
      id: true,
      username: true,
      credentials: true,
      selectedCalendars: true,
    },
  });
  if (!userWithCredentials) {
    return {
      props: { results: [], notFound: true, date: new Date().toISOString() },
      revalidate: 1,
    };
  }
  // Subtract 11 hours from the start date to avoid problems in UTC- time zones.
  const startDate = dayjs.utc(month, "YYYY-MM").startOf("day").subtract(11, "hours").format();
  // Add 14 hours from the start date to avoid problems in UTC+ time zones.
  const endDate = dayjs.utc(month, "YYYY-MM").endOf("month").add(14, "hours").format();
  try {
    const results = userWithCredentials?.credentials
      ? await getCalendarsEvents(
          userWithCredentials?.credentials,
          startDate,
          endDate,
          userWithCredentials?.selectedCalendars
        )
      : [];

    return {
      props: { results, date: new Date().toISOString() },
      revalidate: 1,
    };
  } catch (error) {
    let message = "Unknown error while fetching calendar";
    if (error instanceof Error) message = error.message;
    console.error(error, message);
    return {
      props: { results: [], date: new Date().toISOString(), message },
      revalidate: 1,
    };
  }
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};
type Props = InferGetStaticPropsType<typeof getStaticProps>;
export const CalendarCache = (props: Props) =>
  process.env.NODE_ENV === "development" ? <pre>{JSON.stringify(props, null, "  ")}</pre> : <div />;

export default CalendarCache;
