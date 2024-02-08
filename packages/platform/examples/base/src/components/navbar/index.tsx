import { Inter, Poppins } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "800"] });

export function Navbar() {
  return (
    <nav className="flex h-[75px] w-[100%] items-center justify-between bg-black px-14 py-3 text-white">
      <div className={`flex h-[100%] items-center text-lg ${poppins.className}`}>
        <Link href="/">
          <h1 className="bg-gradient-to-r from-[#8A2387] via-[#E94057] to-[#F27121] bg-clip-text text-2xl font-bold text-transparent">
            CalSync
          </h1>
        </Link>
      </div>
      <div className={`${poppins.className}`}>
        <ul className="flex gap-x-7">
          <li>
            <Link href="/calendars">Calendar</Link>
          </li>
          <li>
            <Link href="/availability">Availability</Link>
          </li>
          <li>
            <Link href="/bookings">Bookings</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
