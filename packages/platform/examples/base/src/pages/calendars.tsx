import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { useConnectedCalendars, CalendarSettings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Calendars(props: { calUsername: string; calEmail: string }) {
  const { isLoading, data: calendars } = useConnectedCalendars({});
  const connectedCalendars = calendars?.connectedCalendars ?? [];

  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      {!isLoading && !connectedCalendars?.length && (
        <h1 className="mx-10 my-4 text-xl font-bold">
          You have not connected any calendars yet, please connect your Google, Outlook or Apple calendar.
        </h1>
      )}
      <div>
        <CalendarSettings />
      </div>
    </main>
  );
}
