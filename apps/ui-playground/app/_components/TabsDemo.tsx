"use client";

import { useState } from "react";

import type { VerticalTabItemProps } from "@calcom/ui";
import { Icon, HorizontalTabs, VerticalTabs } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

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
    info: "3 unread notifications",
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

export default function TabsDemo() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <DemoSection title="Tabs">
      <DemoSubSection id="tabs-horizontal" title="Horizontal Tabs">
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
      </DemoSubSection>

      <DemoSubSection id="tabs-vertical" title="Vertical Tabs">
        <div className="space-y-6">
          <div>
            <h3 className="text-emphasis mb-2 text-sm font-medium">Basic</h3>
            <div className="rounded-md border">
              <VerticalTabs
                tabs={verticalTabItems.map((item) => ({
                  ...item,
                  onClick: () => setActiveTab(item.name),
                  isActive: activeTab === item.name,
                }))}
              />
            </div>
          </div>

          <div>
            <h3 className="text-emphasis mb-2 text-sm font-medium">With Sticky Header</h3>
            <div className="h-96 overflow-auto rounded-md border">
              <VerticalTabs
                sticky
                tabs={verticalTabItems.map((item) => ({
                  ...item,
                  onClick: () => setActiveTab(item.name),
                  isActive: activeTab === item.name,
                }))}
              />
              <div className="p-4">
                <div className="bg-subtle h-96 rounded-md p-4">Scrollable content area</div>
                <div className="bg-subtle mt-4 h-96 rounded-md p-4">More scrollable content</div>
              </div>
            </div>
          </div>
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
