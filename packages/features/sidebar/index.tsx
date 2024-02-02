import { TailwindSidebar } from "@funnelhub/sidebar";

import { sidebarMenuData } from "./data";

export const FunnelHubSidebar = () => {
  return <TailwindSidebar menuData={sidebarMenuData} initialCollapsedState={true} className="!h-auto" />;
};
