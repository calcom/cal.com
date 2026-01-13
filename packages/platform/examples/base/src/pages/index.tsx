import { Navbar } from "@/components/Navbar";
import { Inter, Poppins } from "next/font/google";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter } from "next/router";

import { Connect, StripeConnect } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "800"] });

export default function Home(props: { calUsername: string; calEmail: string }) {
  const router = useRouter();

  return (
    <main className={`flex min-h-screen flex-col ${inter.className} items-center justify-center`}>
      <Navbar username={props.calUsername} />
      <div
        className={` h-screen w-full items-center justify-center gap-y-3  font-mono lg:flex ${inter.className} gap-16 `}>
        <div className="ml-32">
          <h1 className={`${poppins.className} w-full pb-3 text-7xl font-bold`}>
            The all in one Scheduling marketplace
          </h1>
          <p className={`w-[70%] font-normal ${inter.className} pb-3 text-2xl`}>
            To get started, connect your google calendar.
          </p>
          <div data-testid="connect-atoms" className="flex flex-row gap-4">
            <Connect.GoogleCalendar
              redir="http://localhost:4321/calendars"
              className="h-[40px] bg-linear-to-r from-[#8A2387] via-[#E94057] to-[#F27121] text-center text-base font-semibold text-transparent text-white hover:bg-orange-700"
            />
            <Connect.OutlookCalendar
              isMultiCalendar={true}
              redir="http://localhost:4321/calendars"
              className="h-[40px] bg-linear-to-r from-[#8A2387] via-[#E94057] to-[#F27121] text-center text-base font-semibold text-transparent text-white hover:bg-orange-700"
            />
            <Connect.AppleCalendar
              onSuccess={() => {
                router.push(`/calendars`);
              }}
              isMultiCalendar={true}
              className="h-[40px] bg-linear-to-r from-[#8A2387] via-[#E94057] to-[#F27121] text-center text-base font-semibold text-transparent text-white hover:bg-orange-700"
            />
            <StripeConnect
              className="h-[40px] bg-linear-to-r from-[#E94057] via-[#E94057] to-[#E94057] text-center text-base font-semibold text-transparent text-white hover:bg-orange-700"
              errorRedir="http://localhost:4321/availability"
              onCheckSuccess={() => {
                console.log("stripe account connected successfully".toLocaleUpperCase());
              }}
            />
          </div>
        </div>
        <div className="hidden lg:block">
          <img
            width="76%"
            height="76%"
            className="rounded-lg shadow-2xl"
            alt="cover image"
            src="https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=2668&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          />
        </div>
      </div>
    </main>
  );
}
