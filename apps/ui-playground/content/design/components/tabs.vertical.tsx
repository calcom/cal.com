"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";
import { VerticalTabs } from "@calcom/ui/components/navigation";

const verticalTabItems = [
  {
    name: "Overview",
    href: "#",
    icon: "grid-3x3",
  },
  {
    name: "Settings",
    href: "#",
    icon: "settings",
    children: [
      {
        name: "General",
        href: "#",
      },
      {
        name: "Security",
        href: "#",
      },
      {
        name: "Notifications",
        href: "#",
      },
    ],
  },
  {
    name: "Notifications",
    href: "#",
    icon: "bell",
  },
  {
    name: "Documentation",
    href: "https://docs.example.com",
    icon: "book-open",
    isExternalLink: true,
  },
  {
    name: "Disabled Tab",
    href: "#",
    icon: "lock",
    disabled: true,
  },
] as VerticalTabItemProps[];

export const VerticalExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <RenderComponentWithSnippet>
      <div className="max-w-xs space-y-6">
        <div>
          <h3 className="text-emphasis mb-2 text-sm font-medium">Basic</h3>
          <VerticalTabs
            tabs={verticalTabItems.map((item) => ({
              ...item,
              onClick: () => setActiveTab(item.name),
              isActive: activeTab === item.name,
            }))}
          />
        </div>
      </div>
    </RenderComponentWithSnippet>
  );
};
