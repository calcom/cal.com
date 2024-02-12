import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

import { AvailabilitySettings } from "@calcom/platform-atoms/components";

const inter = Inter({ subsets: ["latin"] });

export default function Availability() {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar />
      <div>
        <AvailabilitySettings />
      </div>
    </main>
  );
}
