import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { GetStaticPaths, GetStaticProps } from "next";
import { Fragment } from "react";
import React from "react";
import { z } from "zod";

import { WipeMyCalActionButton } from "@calcom/app-store/wipemycalother/components";
import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/MainLayout";
import { FiltersContainer } from "@calcom/features/bookings/components/FiltersContainer";
import type { filterQuerySchema } from "@calcom/features/bookings/lib/useFilterQuery";
import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { HorizontalTabs } from "@calcom/ui";
import type { VerticalTabItemProps, HorizontalTabItemProps } from "@calcom/ui";
import { Alert, Button, EmptyScreen } from "@calcom/ui";
import { Calendar } from "@calcom/ui/components/icon";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";
import useMeQuery from "@lib/hooks/useMeQuery";

import PageWrapper from "@components/PageWrapper";
import BookingListItem from "@components/booking/BookingListItem";
import BookingListItemAH from "@components/booking/BookingListItemAH";
import SkeletonLoader from "@components/booking/SkeletonLoader";

import { ssgInit } from "@server/lib/ssg";

type BookingListingStatus = z.infer<NonNullable<typeof filterQuerySchema>>["status"];
type BookingOutput = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][0];

type RecurringInfo = {
  recurringEventId: string | null;
  count: number;
  firstDate: Date | null;
  bookings: { [key: string]: Date[] };
};

const tabs: (VerticalTabItemProps | HorizontalTabItemProps)[] = [
  {
    name: "upcoming",
    href: "/bookings/upcoming",
  },
  {
    name: "unconfirmed",
    href: "/bookings/unconfirmed",
  },
  {
    name: "recurring",
    href: "/bookings/recurring",
  },
  {
    name: "past",
    href: "/bookings/past",
  },
  {
    name: "cancelled",
    href: "/bookings/cancelled",
  },
];
const validStatuses = ["upcoming", "recurring", "past", "cancelled", "unconfirmed"] as const;

const descriptionByStatus: Record<NonNullable<BookingListingStatus>, string> = {
  upcoming: "upcoming_bookings",
  recurring: "recurring_bookings",
  past: "past_bookings",
  cancelled: "cancelled_bookings",
  unconfirmed: "unconfirmed_bookings",
};

const querySchema = z.object({
  status: z.enum(validStatuses),
});

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const TOKEN_PATH = "token.json";

const event_list = ["EventBrite", "Dice", "Party"];
const party_events: { title: string; location: string; start: string; end: string }[] = [];

export async function getEvents() {
  const oAuth2Client = await getCredentials();
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const now = new Date().toISOString();

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: now,
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items;
  if (events?.length) {
    console.log("No upcoming events found.");
  } else {
    for (const event of events) {
      const start = event.start.dateTime || event.start.date;
      const end = event.end.dateTime || event.end.date;

      const event_name = event.summary.split();

      for (const i of event_list) {
        if (event_name.includes(i)) {
          party_events.push({
            title: event.summary,
            location: event.location,
            start: start,
            end: end,
          });
        }
      }
    }
  }

  return party_events;
}

async function getCredentials(): Promise<OAuth2Client> {
  // const content = fs.readFileSync("credentials.json", "utf8");
  const content = {
    token:
      "ya29.a0AfB_byDt7sVFd9CnyJlhO1dH_MfalpsIKCWiJLvNWkiM7eioh-5R42ruyO7eh9FXsRR2e466rOYryHQXr4LyQcb6txmS0rVN8IRAupc2n9cOLKJqsXeAVt9yPChan9i2PXNxWbrFktzge7L_fFL-XxEPJyRvDr7JvjUWbgaCgYKAVcSARISFQHGX2MiZ9YVdJ2sidJCAly3R6SlPA0173",
    refresh_token:
      "1//05wIWnZHZi8E9CgYIARAAGAUSNwF-L9Ir9eWDvJSrNFREwk8x5Nb-uCwD_ZfyPftwGth9iVUY3XcYCvj4-ACRwbcmadfVHwR-Zk4",
    token_uri: "https://oauth2.googleapis.com/token",
    client_id: "66083480731-cbqjqolmsdjm0ajp55v1bsiamjc7g4b9.apps.googleusercontent.com",
    client_secret: "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",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    expiry: "2023-12-03T09:37:48.915103Z",
  };
  const { client_secret, client_id, redirect_uris } = content;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(content);
  return oAuth2Client;
}

export default function Bookings(props) {
  const params = useParamsWithFallback();
  const { data: filterQuery } = useFilterQuery();
  const { status } = params ? querySchema.parse(params) : { status: "upcoming" as const };
  const { t } = useLocale();
  const user = useMeQuery().data;

  const query = trpc.viewer.bookings.get.useInfiniteQuery(
    {
      limit: 10,
      filters: {
        ...filterQuery,
        status: filterQuery.status ?? status,
      },
    },
    {
      // first render has status `undefined`
      enabled: true,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Animate page (tab) transitions to look smoothing

  const buttonInView = useInViewObserver(() => {
    if (!query.isFetching && query.hasNextPage && query.status === "success") {
      query.fetchNextPage();
    }
  });

  const isEmpty = !query.data?.pages[0]?.bookings.length;

  const shownBookings: Record<string, BookingOutput[]> = {};
  const filterBookings = (booking: BookingOutput) => {
    if (status === "recurring" || status == "unconfirmed" || status === "cancelled") {
      if (!booking.recurringEventId) {
        return true;
      }
      if (
        shownBookings[booking.recurringEventId] !== undefined &&
        shownBookings[booking.recurringEventId].length > 0
      ) {
        shownBookings[booking.recurringEventId].push(booking);
        return false;
      }
      shownBookings[booking.recurringEventId] = [booking];
    } else if (status === "upcoming") {
      return (
        dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") !==
        dayjs().tz(user?.timeZone).format("YYYY-MM-DD")
      );
    }
    return true;
  };

  let recurringInfoToday: RecurringInfo | undefined;

  const bookingsTodayTemp =
    query.data?.pages.map((page) =>
      page.bookings.filter((booking: BookingOutput) => {
        recurringInfoToday = page.recurringInfo.find(
          (info) => info.recurringEventId === booking.recurringEventId
        );

        return (
          dayjs(booking.startTime).tz(user?.timeZone).format("YYYY-MM-DD") ===
          dayjs().tz(user?.timeZone).format("YYYY-MM-DD")
        );
      })
    )[0] || [];

  const { data } = trpc.viewer.availability.calendarEventsByKeyword.useQuery(
    {
      loggedInUsersTz: "Europe/London",
    },
    {
      enabled: true,
    }
  );

  console.log(data);

  const queryGoogleCalendarList = data;

  const bookingsToday = bookingsTodayTemp.push(queryGoogleCalendarList);

  console.log(bookingsToday);

  const [animationParentRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <ShellMain hideHeadingOnMobile heading={t("bookings")} subtitle={t("bookings_description")}>
      <div className="flex flex-col">
        <div className="flex flex-col flex-wrap lg:flex-row">
          <HorizontalTabs tabs={tabs} />
          <div className="max-w-full overflow-x-auto xl:ml-auto">
            <FiltersContainer />
          </div>
        </div>
        <main className="w-full">
          <div className="flex w-full flex-col" ref={animationParentRef}>
            {query.status === "error" && (
              <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
            )}
            {(query.status === "loading" || query.isPaused) && <SkeletonLoader />}
            {query.status === "success" && !isEmpty && (
              <>
                {!!bookingsToday.length && status === "upcoming" && (
                  <div className="mb-6 pt-2 xl:pt-0">
                    <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
                    <p className="text-subtle mb-2 text-xs font-medium uppercase leading-4">{t("today")}</p>
                    <div className="border-subtle overflow-hidden rounded-md border">
                      <table className="w-full max-w-full table-fixed">
                        <tbody className="bg-default divide-subtle divide-y" data-testid="today-bookings">
                          <Fragment>
                            {bookingsToday.map((booking: BookingOutput) => (
                              <BookingListItem
                                key={booking.id}
                                loggedInUser={{
                                  userId: user?.id,
                                  userTimeZone: user?.timeZone,
                                  userTimeFormat: user?.timeFormat,
                                  userEmail: user?.email,
                                }}
                                listingStatus={status}
                                recurringInfo={recurringInfoToday}
                                {...booking}
                              />
                            ))}
                          </Fragment>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* change this to after hours */}

                {!!bookingsToday.length && status === "upcoming" && (
                  <div className="mb-6 pt-2 xl:pt-0">
                    <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
                    <p className="text-subtle mb-2 text-xs font-medium uppercase leading-4">
                      {t("After Hours")}
                    </p>
                    <div className="border-subtle overflow-hidden rounded-md border">
                      <table className="w-full max-w-full table-fixed">
                        <tbody
                          className="bg-default divide-subtle divide-y"
                          data-testid="today-bookings-afterhours">
                          <Fragment>
                            {bookingsToday.map((booking: BookingOutput) => (
                              <BookingListItem
                                key={booking.id}
                                loggedInUser={{
                                  userId: user?.id,
                                  userTimeZone: user?.timeZone,
                                  userTimeFormat: user?.timeFormat,
                                  userEmail: user?.email,
                                }}
                                listingStatus={status}
                                recurringInfo={recurringInfoToday}
                                {...booking}
                              />
                            ))}
                          </Fragment>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="pt-2 xl:pt-0">
                  <div className="border-subtle overflow-hidden rounded-md border">
                    <table data-testid={`${status}-bookings`} className="w-full max-w-full table-fixed">
                      <tbody className="bg-default divide-subtle divide-y" data-testid="bookings">
                        {query.data.pages.map((page, index) => (
                          <Fragment key={index}>
                            {page.bookings.filter(filterBookings).map((booking: BookingOutput) => {
                              const recurringInfo = page.recurringInfo.find(
                                (info) => info.recurringEventId === booking.recurringEventId
                              );
                              return (
                                <BookingListItemAH
                                  key={booking.id}
                                  loggedInUser={{
                                    userId: user?.id,
                                    userTimeZone: user?.timeZone,
                                    userTimeFormat: user?.timeFormat,
                                    userEmail: user?.email,
                                  }}
                                  listingStatus={status}
                                  recurringInfo={recurringInfo}
                                  {...booking}
                                />
                              );
                            })}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-default p-4 text-center" ref={buttonInView.ref}>
                    <Button
                      color="minimal"
                      loading={query.isFetchingNextPage}
                      disabled={!query.hasNextPage}
                      onClick={() => query.fetchNextPage()}>
                      {query.hasNextPage ? t("load_more_results") : t("no_more_results")}
                    </Button>
                  </div>
                </div>
              </>
            )}
            {query.status === "success" && isEmpty && (
              <div className="flex items-center justify-center pt-2 xl:pt-0">
                <EmptyScreen
                  Icon={Calendar}
                  headline={t("no_status_bookings_yet", { status: t(status).toLowerCase() })}
                  description={t("no_status_bookings_yet_description", {
                    status: t(status).toLowerCase(),
                    description: t(descriptionByStatus[status]),
                  })}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </ShellMain>
  );
}

Bookings.PageWrapper = PageWrapper;
Bookings.getLayout = getLayout;

// get server side pops

// export const getServerSideProps: GetServerSideProps<UserPageProps> = async (context) => {
//   return {
//     props: {
//       allEvents: getEventsByKeywords(),
//     },
//   };
// };
export const getStaticProps: GetStaticProps = async (ctx) => {
  const params = querySchema.safeParse(ctx.params);
  const ssg = await ssgInit(ctx);

  if (!params.success) return { notFound: true };

  return {
    props: {
      status: params.data.status,
      trpcState: ssg.dehydrate(),
      // allEvents: getEventsByKeywords(),
    },
  };
};

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: validStatuses.map((status) => ({
      params: { status },
      locale: "en",
    })),
    fallback: "blocking",
  };
};
