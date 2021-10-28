import { CalendarIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";

import { QueryCell } from "@lib/QueryCell";
import { useLocale } from "@lib/hooks/useLocale";
import { inferQueryInput, trpc } from "@lib/trpc";

import BookingsShell from "@components/BookingsShell";
import EmptyScreen from "@components/EmptyScreen";
import Shell from "@components/Shell";
import BookingListItem from "@components/booking/BookingListItem";

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

  const { isFetchingNextPage, hasNextPage, fetchNextPage } = query;

  return (
    <Shell
      heading={t("bookings")}
      subtitle={t("bookings_description")}
      isFetchingNextPage={isFetchingNextPage}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}>
      <BookingsShell>
        <div className="flex flex-col -mx-4 sm:mx-auto">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <QueryCell
                query={query}
                success={({ data }) => {
                  console.log("DATA", data);
                  return (
                    <div className="my-6 overflow-hidden border border-b border-gray-200 rounded-sm">
                      <table className="min-w-full divide-y divide-gray-200">
                        <tbody className="bg-white divide-y divide-gray-200" data-testid="bookings">
                          {data?.pages.map((page) =>
                            page?.bookings.map((booking) => <BookingListItem key={booking.id} {...booking} />)
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                }}
                empty={() => (
                  <EmptyScreen
                    Icon={CalendarIcon}
                    headline={t("no_status_bookings_yet", { status: status })}
                    description={t("no_status_bookings_yet_description", {
                      status: status,
                      description: descriptionByStatus[status],
                    })}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </BookingsShell>
    </Shell>
  );
}
