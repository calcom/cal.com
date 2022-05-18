import { CalendarIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { Fragment } from "react";

import { WipeMyCalActionButton } from "@calcom/app-store/wipemycalother/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import EmptyScreen from "@calcom/ui/EmptyScreen";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";
import { inferQueryInput, inferQueryOutput, trpc } from "@lib/trpc";

import BookingsShell from "@components/BookingsShell";
import Shell from "@components/Shell";
import BookingListItem from "@components/booking/BookingListItem";
import SkeletonLoader from "@components/booking/SkeletonLoader";

type BookingListingStatus = inferQueryInput<"viewer.bookings">["status"];
type BookingOutput = inferQueryOutput<"viewer.bookings">["bookings"][0];
type BookingPage = inferQueryOutput<"viewer.bookings">;

export default function Bookings() {
  const router = useRouter();
  const status = router.query?.status as BookingListingStatus;

  const { t } = useLocale();

  const descriptionByStatus: Record<BookingListingStatus, string> = {
    upcoming: t("upcoming_bookings"),
    recurring: t("recurring_bookings"),
    past: t("past_bookings"),
    cancelled: t("cancelled_bookings"),
  };

  const query = trpc.useInfiniteQuery(["viewer.bookings", { status, limit: 10 }], {
    // first render has status `undefined`
    enabled: !!status,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const buttonInView = useInViewObserver(() => {
    if (!query.isFetching && query.hasNextPage && query.status === "success") {
      query.fetchNextPage();
    }
  });

  const isEmpty = !query.data?.pages[0]?.bookings.length;

  // Get the recurrentCount value from the grouped recurring bookings
  // created with the same recurringEventId
  const defineRecurrentCount = (booking: BookingOutput, page: BookingPage) => {
    let recurringCount = undefined;
    if (booking.recurringEventId !== null) {
      recurringCount = page.groupedRecurringBookings.filter(
        (group) => group.recurringEventId === booking.recurringEventId
      )[0]._count; // If found, only one object exists, just assing the needed _count value
    }
    return { recurringCount };
  };

  return (
    <Shell heading={t("bookings")} subtitle={t("bookings_description")} customLoader={<SkeletonLoader />}>
      <WipeMyCalActionButton trpc={trpc} bookingStatus={status} bookingsEmpty={isEmpty} />
      <BookingsShell>
        <div className="-mx-4 flex flex-col sm:mx-auto">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              {query.status === "error" && (
                <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
              )}
              {(query.status === "loading" || query.status === "idle") && <SkeletonLoader />}
              {query.status === "success" && !isEmpty && (
                <>
                  <div className="mt-6 overflow-hidden rounded-sm border border-b border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-200 bg-white" data-testid="bookings">
                        {query.data.pages.map((page, index) => (
                          <Fragment key={index}>
                            {page.bookings.map((booking) => (
                              <BookingListItem
                                key={booking.id}
                                listingStatus={status}
                                {...defineRecurrentCount(booking, page)}
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
                </>
              )}
              {query.status === "success" && isEmpty && (
                <EmptyScreen
                  Icon={CalendarIcon}
                  headline={t("no_status_bookings_yet", { status: t(status) })}
                  description={t("no_status_bookings_yet_description", {
                    status: t(status),
                    description: descriptionByStatus[status],
                  })}
                />
              )}
            </div>
          </div>
        </div>
      </BookingsShell>
    </Shell>
  );
}
