import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";

import { ConferencingAppsSettings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function ConferencingApps(props: { calUsername: string; calEmail: string }) {
  const pathname = usePathname();
  const callbackUri = `${window.location.origin}${pathname}`;

  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <div className="my-8">
        <ConferencingAppsSettings returnTo={callbackUri} onErrorReturnTo={callbackUri} />
      </div>
    </main>
  );
}
