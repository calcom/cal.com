import { type ConferencingAppsCustomClassNames, ConferencingAppsSettings } from "@calcom/atoms";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function ConferencingApps(props: { calUsername: string; calEmail: string }) {
  const pathname = usePathname();
  const callbackUri = `${window.location.origin}${pathname}`;
  const customClassNames: ConferencingAppsCustomClassNames = {
    containerClassName: "bg-red-50 p-4 rounded-lg",
    addButtonClassName: "bg-blue-600 hover:bg-blue-700 text-white",
    addDropdownClassName: "bg-indigo-50 border-2 border-indigo-300",
    appListClassName: "border-2 border-green-500",
    appCardClassName: "bg-blue-50 border-b-2 border-blue-300",
    appCardMenuClassName: "bg-pink-50 border-2 border-pink-300",
    emptyScreenClassName: "bg-yellow-50 border-yellow-300",
    emptyScreenIconWrapperClassName: "bg-purple-100",
    emptyScreenIconClassName: "text-purple-600",
    skeletonClassName: "bg-gray-300",
  };

  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <div className="my-8">
        <ConferencingAppsSettings
          returnTo={callbackUri}
          onErrorReturnTo={callbackUri}
          customClassNames={customClassNames}
        />
      </div>
    </main>
  );
}
