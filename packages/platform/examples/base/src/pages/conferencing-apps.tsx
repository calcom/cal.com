import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter } from "next/router";

import { ConferencingAppsSettings } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function ConferencingApps(props: { calUsername: string; calEmail: string }) {
  const router = useRouter();

  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <div className="my-8">
        <ConferencingAppsSettings
          title="Conferencing"
          description="Add your favourite video conferencing apps for your meetings"
          add="add"
        />
      </div>
    </main>
  );
}
