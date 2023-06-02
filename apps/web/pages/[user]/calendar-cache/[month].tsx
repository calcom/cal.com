/**
 * This page is empty for the user, it is used only to take advantage of the
 * caching system that NextJS uses SSG pages.
 * TODO: Redirect to user profile on browser
 */
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { z } from "zod";

import { getCachedResults } from "@calcom/core";
import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

const paramsSchema = z.object({ user: z.string(), month: z.string() });
export const getStaticProps: GetStaticProps<
  { results: Awaited<ReturnType<typeof getCachedResults>> },
  { user: string }
> = async (context) => {
  const { user: username, month } = paramsSchema.parse(context.params);
  const userWithCredentials = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      username: true,
      credentials: true,
      selectedCalendars: true,
    },
  });
  // Subtract 11 hours from the start date to avoid problems in UTC- time zones.
  const startDate = dayjs.utc(month, "YYYY-MM").startOf("day").subtract(11, "hours").format();
  // Add 14 hours from the start date to avoid problems in UTC+ time zones.
  const endDate = dayjs.utc(month, "YYYY-MM").endOf("month").add(14, "hours").format();
  try {
    const results = userWithCredentials?.credentials
      ? await getCachedResults(
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
const CalendarCache = (props: Props) =>
  process.env.NODE_ENV === "development" ? <pre>{JSON.stringify(props, null, "  ")}</pre> : <div />;

export default CalendarCache;
