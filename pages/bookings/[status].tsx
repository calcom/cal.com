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
  const { t } = useLocale();

  const descriptionByStatus: Record<BookingListingStatus, string> = {
    upcoming: t("upcoming_bookings"),
    past: t("past_bookings"),
    cancelled: t("cancelled_bookings"),
  };

  const router = useRouter();
  const status = router.query?.status as BookingListingStatus;

  const query = trpc.useQuery(["viewer.bookings", { status }], {
    // first render has status `undefined`
    enabled: !!status,
  });

  return (
    <Shell heading={t("bookings")} subtitle={t("bookings_description")}>
      <BookingsShell>
        <div className="-mx-4 sm:mx-auto flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <QueryCell
                query={query}
                success={({ data }) => (
                  <div className="my-6 border border-gray-200 overflow-hidden border-b rounded-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="bg-white divide-y divide-gray-200" data-testid="bookings">
                        {data.map((booking) => (
                          <BookingListItem key={booking.id} {...booking} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
