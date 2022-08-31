import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { Fragment } from "react";
import { z } from "zod";

import { WipeMyCalActionButton } from "@calcom/app-store/wipemycalother/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryInput, inferQueryOutput, trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/Alert";
import { Icon } from "@calcom/ui/Icon";
import { Button, EmptyScreen } from "@calcom/ui/v2";
import BookingLayout from "@calcom/ui/v2/core/layouts/BookingLayout";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import BookingListItem from "@components/booking/BookingListItem";
import SkeletonLoader from "@components/booking/SkeletonLoader";

type BookingListingStatus = inferQueryInput<"viewer.bookings">["status"];
type BookingOutput = inferQueryOutput<"viewer.bookings">["bookings"][0];

const validStatuses = ["upcoming", "recurring", "past", "cancelled"] as const;

const descriptionByStatus: Record<BookingListingStatus, string> = {
  upcoming: "upcoming_bookings",
  recurring: "recurring_bookings",
  past: "past_bookings",
  cancelled: "cancelled_bookings",
};

const querySchema = z.object({
  status: z.enum(validStatuses),
});

export default function Bookings() {
  const router = useRouter();
  const { status } = router.isReady ? querySchema.parse(router.query) : { status: "upcoming" as const };
  const { t } = useLocale();

  const query = trpc.useInfiniteQuery(["viewer.bookings", { status, limit: 10 }], {
    // first render has status `undefined`
    enabled: router.isReady,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const buttonInView = useInViewObserver(() => {
    if (!query.isFetching && query.hasNextPage && query.status === "success") {
      query.fetchNextPage();
    }
  });

  const isEmpty = !query.data?.pages[0]?.bookings.length;

  // Get all recurring events of the series with the same recurringEventId
  const defineRecurrentBookings = (
    booking: BookingOutput,
    groupedBookings: Record<string, BookingOutput[]>
  ) => {
    let recurringBookings = undefined;
    if (booking.recurringEventId !== null) {
      recurringBookings = groupedBookings[booking.recurringEventId];
    }
    return { recurringBookings };
  };
  const shownBookings: Record<string, BookingOutput[]> = {};
  const filterBookings = (booking: BookingOutput) => {
    if (status === "recurring" || status === "cancelled") {
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
    }
    return true;
  };
  return (
    <BookingLayout
      heading={t("bookings")}
      subtitle={t("bookings_description")}
      customLoader={<SkeletonLoader />}>
      <WipeMyCalActionButton bookingStatus={status} bookingsEmpty={isEmpty} />
      <div className="flex w-full flex-1 flex-col">
        {query.status === "error" && (
          <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
        )}
        {(query.status === "loading" || query.status === "idle") && <SkeletonLoader />}
        {query.status === "success" && !isEmpty && (
          <div className="pt-2 xl:mx-6 xl:pt-0">
            <p className="pb-3 text-xs font-medium leading-4 text-gray-500">Today</p>
            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="w-full">
                <tbody className="divide-y divide-gray-200 bg-white" data-testid="bookings">
                  {query.data.pages.map((page, index) => (
                    <Fragment key={index}>
                      {page.bookings.filter(filterBookings).map((booking: BookingOutput) => (
                        <BookingListItem
                          key={booking.id}
                          listingStatus={status}
                          {...defineRecurrentBookings(booking, shownBookings)}
                          {...booking}
                        />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 text-center" ref={buttonInView.ref}>
              <Button
                color="minimal"
                loading={query.isFetchingNextPage}
                disabled={!query.hasNextPage}
                onClick={() => query.fetchNextPage()}>
                {query.hasNextPage ? t("load_more_results") : t("no_more_results")}
              </Button>
            </div>
          </div>
        )}
        {query.status === "success" && isEmpty && (
          <div className="flex items-center justify-center pt-2 xl:mx-6 xl:pt-0">
            <EmptyScreen
              Icon={Icon.FiCalendar}
              headline={t("no_status_bookings_yet", { status: t(status).toLowerCase() })}
              description={t("no_status_bookings_yet_description", {
                status: t(status).toLowerCase(),
                description: t(descriptionByStatus[status]),
              })}
            />
          </div>
        )}
      </div>
    </BookingLayout>
  );
}

export const getStaticProps: GetStaticProps = (ctx) => {
  const params = querySchema.safeParse(ctx.params);

  if (!params.success) return { notFound: true };

  return {
    props: {
      status: params.data.status,
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
