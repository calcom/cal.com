/**
 * This page is empty for the user, it is used only to take advantage of the
 * caching system that NextJS uses SSG pages.
 * TODO: Redirect to user profile on browser
 */
import { GetStaticPaths, GetStaticProps } from "next";
import { z } from "zod";

import { getCachedResults } from "@calcom/core";
import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

const CalendarCache = () => <div />;

const paramsSchema = z.object({ user: z.string(), month: z.string() });
export const getStaticProps: GetStaticProps<
  { results: Awaited<ReturnType<typeof getCachedResults>> },
  { user: string }
> = async (context) => {
  const { user: username, month } = paramsSchema.parse(context.params);
  const user = await prisma.user.findUnique({
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
  const startDate = (
    dayjs(month, "YYYY-MM").isSame(dayjs(), "month") ? dayjs() : dayjs(month, "YYYY-MM")
  ).startOf("day");
  const endDate = startDate.endOf("month");
  const results = user?.credentials
    ? await getCachedResults(user?.credentials, startDate.format(), endDate.format(), user?.selectedCalendars)
    : [];
  return {
    props: { results, date: new Date().toISOString() },
    revalidate: 1,
  };
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export default CalendarCache;
