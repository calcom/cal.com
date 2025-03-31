"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Icon } from "@calcom/ui/components/icon";
import { HorizontalTabs } from "@calcom/ui/components/navigation";

const tabItems = [
  {
    name: "Overview",
    href: "#",
    icon: "grid-3x3",
  },
  {
    name: "Settings",
    href: "#",
    icon: "settings",
  },
  {
    name: "Notifications",
    href: "#",
    icon: "bell",
    info: "3 unread notifications",
  },
  {
    name: "Profile",
    href: "#",
    avatar: "https://avatars.githubusercontent.com/u/8019099?v=4",
  },
] as const;

export const HorizontalExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <RenderComponentWithSnippet>
      <div className="space-y-6">
        <div>
          <h3 className="text-emphasis mb-2 text-sm font-medium">Basic</h3>
          <HorizontalTabs
            tabs={tabItems.map((item) => ({
              ...item,
              icon: undefined,
              onClick: () => setActiveTab(item.name),
              isActive: activeTab === item.name,
            }))}
          />
        </div>

        <div>
          <h3 className="text-emphasis mb-2 text-sm font-medium">With Icons</h3>
          <HorizontalTabs
            tabs={tabItems.map((item) => ({
              ...item,
              onClick: () => setActiveTab(item.name),
              isActive: activeTab === item.name,
            }))}
          />
        </div>

        <div>
          <h3 className="text-emphasis mb-2 text-sm font-medium">With Actions</h3>
          <HorizontalTabs
            tabs={tabItems.map((item) => ({
              ...item,
              onClick: () => setActiveTab(item.name),
              isActive: activeTab === item.name,
            }))}
            actions={
              <button className="hover:text-emphasis text-default ml-auto flex items-center space-x-1 rounded-md px-3 py-[10px] transition">
                <Icon name="plus" className="h-4 w-4" />
                <span>Add New</span>
              </button>
            }
          />
        </div>
      </div>
    </RenderComponentWithSnippet>
  );
};
