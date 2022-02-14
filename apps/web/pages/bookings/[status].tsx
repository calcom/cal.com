import { CalendarIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { Fragment } from "react";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";
import { useLocale } from "@lib/hooks/useLocale";
import { inferQueryInput, trpc } from "@lib/trpc";

import BookingsShell from "@components/BookingsShell";
import EmptyScreen from "@components/EmptyScreen";
import Loader from "@components/Loader";
import Shell from "@components/Shell";
import BookingListItem from "@components/booking/BookingListItem";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

type BookingListingStatus = inferQueryInput<"viewer.bookings">["status"];

export default function Bookings() {
  const router = useRouter();
  const status = router.query?.status as BookingListingStatus;

  const { t } = useLocale();

  const descriptionByStatus: Record<BookingListingStatus, string> = {
    upcoming: t("upcoming_bookings"),
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

  return (
    <Shell heading={t("bookings")} subtitle={t("bookings_description")}>
      <BookingsShell>
        <div className="-mx-4 flex flex-col sm:mx-auto">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              {query.status === "error" && (
                <Alert severity="error" title={t("something_went_wrong")} message={query.error.message} />
              )}
              {(query.status === "loading" || query.status === "idle") && <Loader />}
              {query.status === "success" && !isEmpty && (
                <>
                  <div className="mt-6 overflow-hidden rounded-sm border border-b border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-200 bg-white" data-testid="bookings">
                        {query.data.pages.map((page, index) => (
                          <Fragment key={index}>
                            {page.bookings.map((booking) => (
                              <BookingListItem key={booking.id} {...booking} />
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 text-center" ref={buttonInView.ref}>
                    <Button
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
