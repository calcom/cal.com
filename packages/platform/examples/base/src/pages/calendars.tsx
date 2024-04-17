import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { useConnectedCalendars } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Calendars(props: { calUsername: string; calEmail: string }) {
  const { isLoading, data: calendars } = useConnectedCalendars();
  const connectedCalendars = calendars?.connectedCalendars ?? [];
  const destinationCalendar = calendars?.destinationCalendar ?? {};
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div className="p-4">
        {!!connectedCalendars?.length ? (
          <h1 className="my-4 text-lg font-bold">Your Connected Calendars</h1>
        ) : (
          <h1 className="mx-10 my-4 text-xl font-bold">
            You have not connected any calendars yet, please connect your Google calendar.
          </h1>
        )}
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          Boolean(connectedCalendars?.length) &&
          connectedCalendars.map((connectedCalendar) => (
            <div key={connectedCalendar.credentialId}>
              <h1 className="text-md font-bold">{connectedCalendar.integration.name}</h1>
              {connectedCalendar.calendars?.map((calendar) => (
                <div key={calendar.id}>
                  <h2>{calendar.name}</h2>
                </div>
              ))}
            </div>
          ))
        )}
        {!!connectedCalendars?.length && <hr className="my-4" />}
        {!isLoading && destinationCalendar.id && (
          <div className="">
            <h2 className="text-md font-bold">Destination Calendar: {destinationCalendar.name}</h2>
            <p>{destinationCalendar.integrationTitle}</p>
          </div>
        )}
      </div>
    </main>
  );
}
