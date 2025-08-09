import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { CalendarSettings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Calendars(props: { calUsername: string; calEmail: string }) {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div>
        <CalendarSettings
          allowDelete={true}
          classNames={{
            destinationCalendarSettingsClassNames: {
              container: "bg-red-200",
              header: {
                container: "bg-gray-200",
                title: "text-green-500",
                description: "text-red-500",
              },
            },
            selectedCalendarSettingsClassNames: {
              container: "bg-red-200 mx-5 mb-6",
              header: {
                container: "bg-gray-200",
                title: "text-green-500",
                description: "text-red-500",
              },
              noSelectedCalendarsMessage: "text-blue-500",
            },
          }}
        />
      </div>
    </main>
  );
}
