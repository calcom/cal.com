import { CalendarSettings } from "@calcom/atoms";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function Calendars(props: { calUsername: string; calEmail: string }) {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div data-testid="calendars-settings-atom">
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
              container: "mx-5 mb-6",
              header: {
                container: "bg-gray-200 rounded-md",
                title: "text-green-500",
                description: "text-red-500",
              },
              noSelectedCalendarsMessage: "text-blue-500",
              selectedCalendarsListClassNames: {
                container: "bg-yellow-100",
                selectedCalendar: {
                  container: "bg-yellow-200",
                  header: {
                    container: "bg-yellow-500",
                    title: "text-green-500",
                    description: "text-red-500",
                  },
                  body: {
                    container: "bg-yellow-500",
                    description: "text-red-500",
                  },
                },
              },
            },
          }}
        />
      </div>
    </main>
  );
}
