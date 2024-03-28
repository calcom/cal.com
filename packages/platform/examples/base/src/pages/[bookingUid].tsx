import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";

import { useGetBooking, useCancelBooking } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const router = useRouter();
  const { isLoading, data: booking, refetch } = useGetBooking((router.query.bookingUid as string) ?? "");
  const { mutate: cancelBooking } = useCancelBooking({
    onSuccess: () => {
      refetch();
    },
  });
  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      {isLoading && <p>Loading...</p>}
      {!isLoading && booking && (
        <div key={booking.id} className="my-2 w-[440px] overflow-hidden rounded p-2 shadow-md">
          <div className="px-6 py-4">
            <div className="text-md mb-0.5 font-semibold">
              <p>{booking.title}</p>
            </div>
          </div>
          <div className="px-6 pb-2">
            <p>{booking.description}</p>
            <p>{booking.startTime}</p>
            <p>{booking.endTime}</p>
            <p>{booking.status}</p>
          </div>
          <div className="px-6">
            <button
              className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
              onClick={() => {
                cancelBooking({
                  id: parseInt(booking.id),
                  uid: booking.uid,
                  cancellationReason: "User request",
                  allRemainingBookings: true,
                });
              }}>
              Cancel
            </button>
            <button
              className="ml-4 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
              onClick={() => {
                router.push(
                  `/booking?rescheduleUid=${booking?.uid}&eventTypeSlug=${booking?.eventType?.slug}`
                );
              }}>
              Reschedule
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
