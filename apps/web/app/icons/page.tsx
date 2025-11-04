import { _generateMetadataForStaticPage } from "app/_utils";
import type { Metadata } from "next";
import localFont from "next/font/local";

import { IconSprites } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon";

import { lucideIconList } from "../../../../packages/ui/components/icon/icon-list.mjs";
import { IconGrid } from "./IconGrid";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  return await _generateMetadataForStaticPage("Icons Showcase", "", undefined, undefined, "/icons");
}

const calSansUI = localFont({
  src: [
    {
      path: "../../fonts/cal-sans-ui/CalSansText-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../fonts/cal-sans-ui/CalSansText-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/cal-sans-ui/CalSansText-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../fonts/cal-sans-ui/CalSansText-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../fonts/cal-sans-ui/CalSansText-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  preload: true,
  display: "swap",
});
const calFont = localFont({
  src: "../../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "swap",
  weight: "600",
});

export default function IconsPage() {
  const icons = Array.from(lucideIconList).sort() as IconName[];

  return (
    <div className={`${calSansUI.variable} ${calFont.variable}`}>
      <div className="bg-subtle flex h-screen">
        <IconSprites />
        <div className="bg-default m-auto min-w-full rounded-md p-10 text-right ltr:text-left">
          <h1 className="text-emphasis font-cal text-2xl font-medium">Icons Showcase</h1>
          <IconGrid title="Regular Icons" icons={icons} />
          <IconGrid
            title="Filled Icons"
            icons={icons}
            rootClassName="bg-inverted text-inverted"
            iconClassName="fill-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
