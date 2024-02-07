import { Inter } from "next/font/google";

import { GcalConnect } from "@calcom/platform-atoms/components";
import { Availability } from "@calcom/platform-atoms/components";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}>
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <GcalConnect className="bg-orange-600 hover:bg-orange-700" />
        <Availability />
      </div>
    </main>
  );
}
