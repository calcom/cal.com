import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { Booker } from "@calcom/platform-atoms/components";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  console.log(props);
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar />
      <div>
        <h1>This is the bookers page</h1>
        <Booker eventSlug="thirty-minutes" username={props.calUsername ?? ""} />
      </div>
    </main>
  );
}
