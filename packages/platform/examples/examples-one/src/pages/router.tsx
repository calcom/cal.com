import { Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function Router(props: { calUsername: string; calEmail: string }) {
  return (
    <main className={`flex ${inter.className} text-default dark flex flex-col`}>
      <Navbar username={props.calUsername} />
      <div>
        <h1 className="mx-8 my-4 text-2xl font-bold">This is the router atom</h1>
      </div>
    </main>
  );
}
