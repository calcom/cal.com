import { CalendarIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";

import { inferQueryInput, trpc } from "@lib/trpc";

import BookingsShell from "@components/BookingsShell";
import EmptyScreen from "@components/EmptyScreen";
import Loader from "@components/Loader";
import Shell from "@components/Shell";
import BookingListItem from "@components/booking/BookingListItem";
import { Alert } from "@components/ui/Alert";

type BookingListingStatus = inferQueryInput<"viewer.bookings">["status"];

export default function Bookings() {
  const router = useRouter();
  const status = router.query?.status as BookingListingStatus;
  const query = trpc.useQuery(["viewer.bookings", { status }]);
  const bookings = query.data;

  return (
    <Shell heading="Bookings" subtitle="See upcoming and past events booked through your event type links.">
      <BookingsShell>
        <div className="-mx-4 sm:mx-auto flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              {query.status === "error" && (
                <Alert severity="error" title="Something went wrong" message={query.error.message} />
              )}
              {query.status === "loading" && <Loader />}
              {bookings &&
                (bookings.length === 0 ? (
                  <EmptyScreen
                    Icon={CalendarIcon}
                    headline="No upcoming bookings, yet"
                    description="You have no upcoming bookings. As soon as someone books a time with you it will show up here."
                  />
                ) : (
                  <div className="my-6 border border-gray-200 overflow-hidden border-b rounded-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="bg-white divide-y divide-gray-200" data-testid="bookings">
                        {bookings.map((booking) => (
                          <BookingListItem key={booking.id} {...booking} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </BookingsShell>
    </Shell>
  );
}
