import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";

import { useGetBookings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const { isLoading: isLoadingUpcomingBookings, data: upcomingBookings } = useGetBookings({
    limit: 50,
    cursor: 0,
    filters: { status: "upcoming" },
  });

  const { isLoading: isLoadingPastBookings, data: pastBookings } = useGetBookings({
    limit: 50,
    cursor: 0,
    filters: { status: "past" },
  });
  const isLoading = isLoadingUpcomingBookings || isLoadingPastBookings;
  const router = useRouter();

  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <h1 className="my-4 text-2xl font-semibold">{props.calUsername} Bookings</h1>
      {isLoading && <p>Loading...</p>}
      {!isLoading &&
        (Boolean(upcomingBookings?.bookings.length) || Boolean(pastBookings?.bookings.length)) &&
        [...pastBookings?.bookings, ...upcomingBookings?.bookings].map((booking) => (
          <div
            key={booking.id}
            className="my-2 w-[440px] cursor-pointer overflow-hidden rounded shadow-md"
            onClick={() => {
              router.push(`/${booking.uid}`);
            }}>
            <div className="px-6 py-4">
              <div className="text-md mb-0.5 font-semibold">
                <p>{booking.title}</p>
              </div>
            </div>
            <div className="px-6 pb-2">
              <p>{booking.startTime}</p>
              <p>{booking.endTime}</p>
              <p>{booking.status}</p>
            </div>
          </div>
        ))}
    </main>
  );
}
