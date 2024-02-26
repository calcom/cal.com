import { TailwindSidebar } from "@funnelhub/sidebar";

import { sidebarMenuData } from "./data";

export const FunnelHubSidebar = () => {
  return (
    <TailwindSidebar
      menuData={sidebarMenuData}
      initialCollapsedState={true}
      className="border-r-gray-[#282939] !h-auto bg-[#14141F] hover:[&>a>div]:bg-[#BF0D51]"
    />
  );
};
