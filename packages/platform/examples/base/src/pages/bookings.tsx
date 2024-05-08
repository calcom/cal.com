import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter } from "next/router";

import { useGetBookings } from "@calcom/atoms";
import dayjs from "@calcom/dayjs";

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
        pastBookings?.bookings &&
        upcomingBookings?.bookings &&
        (Boolean(upcomingBookings?.bookings.length) || Boolean(pastBookings?.bookings.length)) &&
        [...pastBookings?.bookings, ...upcomingBookings?.bookings].map((booking) => {
          const date = dayjs(booking.startTime).toDate();
          const startTime = dayjs(booking?.startTime).format(12 === 12 ? "h:mma" : "HH:mm");
          const endTime = dayjs(booking?.endTime).format(12 === 12 ? "h:mma" : "HH:mm");
          const day = dayjs(date).format("dddd");
          const month = dayjs(date).format("MMMM");

          return (
            <div
              key={booking.id}
              className="mx-10 my-2 flex w-[80vw] cursor-pointer items-center justify-between overflow-hidden rounded border-[0.8px] border-black py-4"
              onClick={() => {
                router.push(`/${booking.uid}`);
              }}>
              <div>
                <div className="px-6">{`${day}, ${dayjs(booking.startTime).date()} ${month}`}</div>
                <div className="px-6">
                  <p>
                    {startTime} - {endTime}
                  </p>{" "}
                  <p />
                </div>
              </div>
              <div>
                <div className="px-6">
                  <div className="text-md mb-0.5 font-semibold">
                    <p>{booking.title}</p>
                  </div>
                </div>
                <div className="px-6">
                  <p>
                    {booking?.user?.name} and {booking.attendees[0].name}
                  </p>{" "}
                  <p />
                </div>
              </div>
            </div>
          );
        })}
    </main>
  );
}
