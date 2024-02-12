import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Calendars() {
  return (
    <main className={`flex min-h-screen flex-col ${inter.className}`}>
      <Navbar />
      <div>
        <h1>This is the google calendar page</h1>
      </div>
    </main>
  );
}
