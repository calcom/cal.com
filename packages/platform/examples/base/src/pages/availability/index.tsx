import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { ListSchedules } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Availability(props: { calUsername: string; calEmail: string }) {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar username={props.calUsername} />
      <div data-testid="list-schedules-atom" className="mx-10 my-10">
        <ListSchedules getRedirectUrl={(scheduleId) => `/availability/${scheduleId}`} />
      </div>
    </main>
  );
}
