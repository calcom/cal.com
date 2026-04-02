import { CalendarView } from "@calcom/atoms";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function CalendarViewAtom(props: { calUsername: string; calEmail: string }) {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div data-testid="calendars-settings-atom">
        {/* <CalendarView isEventTypeView={true} username={props.calUsername} eventSlug="sixty-minutes" /> */}
        <CalendarView />
      </div>
    </main>
  );
}
