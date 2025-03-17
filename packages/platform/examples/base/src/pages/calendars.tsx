import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { CalendarSettings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Calendars(props: { calUsername: string; calEmail: string }) {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div>
        <CalendarSettings allowDelete={true} />
      </div>
    </main>
  );
}
