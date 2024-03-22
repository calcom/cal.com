import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
import { useState } from "react";

import { Booker } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const [bookingTitle, setBookingTitle] = useState<string | null>(null);
  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <div>
        <h1 className="my-4 text-2xl font-semibold">{props.calUsername} Public Booking Page</h1>
        {!bookingTitle && (
          <Booker
            eventSlug="sixty-minutes-video"
            username={props.calUsername ?? ""}
            onCreateBookingSuccess={(data) => {
              setBookingTitle(data.data.title);
            }}
          />
        )}
        {bookingTitle && <p>Booking created: {bookingTitle}</p>}
      </div>
    </main>
  );
}
