import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { CalendarView } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function CalendarViewAtom(props: { calUsername: string; calEmail: string }) {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div data-testid="calendars-settings-atom">
        <CalendarView username={props.calUsername} eventSlug="sixty-minutes" />
      </div>
    </main>
  );
}
