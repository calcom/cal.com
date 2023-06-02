/**
 * This page is empty for the user, it is used only to take advantage of the
 * caching system that NextJS uses SSG pages.
 * TODO: Redirect to user profile on browser
 */
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { z } from "zod";

import getCalendarsEvents from "@calcom/core/getCalendarsEvents";
import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";

const paramsSchema = z.object({ user: z.string(), month: z.string() });
export const getStaticProps: GetStaticProps<
  { results: Awaited<ReturnType<typeof getCalendarsEvents>> },
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
  const startDate = (
    dayjs(month, "YYYY-MM").isSame(dayjs(), "month") ? dayjs.utc() : dayjs.utc(month, "YYYY-MM")
  ).startOf("day");
  const endDate = startDate.endOf("month");
  try {
    const results = userWithCredentials?.credentials
      ? await getCalendarsEvents(
          userWithCredentials?.credentials,
          startDate.format(),
          endDate.format(),
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
