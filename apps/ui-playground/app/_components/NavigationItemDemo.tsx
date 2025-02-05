"use client";

import { Badge, NavigationItem } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function NavigationItemDemo() {
  return (
    <DemoSection title="Navigation Item">
      {/* Basic Navigation Items */}
      <DemoSubSection id="navigation-basic" title="Basic">
        <div className="flex w-56 flex-col space-y-1">
          <NavigationItem
            item={{
              name: "Event Types",
              href: "#event-types",
              icon: "link",
            }}
          />
          <NavigationItem
            item={{
              name: "Availability",
              href: "#availability",
              icon: "clock",
            }}
          />
        </div>
      </DemoSubSection>

      {/* With Badge */}
      <DemoSubSection id="navigation-badge" title="With Badge">
        <div className="flex w-56 flex-col space-y-1">
          <NavigationItem
            item={{
              name: "Bookings",
              href: "#bookings",
              icon: "calendar",
              badge: <Badge variant="blue">3</Badge>,
            }}
          />
          <NavigationItem
            item={{
              name: "Teams",
              href: "#teams",
              icon: "users",
              badge: <Badge variant="gray">New</Badge>,
            }}
          />
        </div>
      </DemoSubSection>

      {/* With Children */}
      <DemoSubSection id="navigation-children" title="With Children">
        <div className="flex w-56 flex-col space-y-1">
          <NavigationItem
            item={{
              name: "Apps",
              href: "#apps",
              icon: "grid-3x3",
              isCurrent: true,
              child: [
                {
                  name: "App Store",
                  href: "#apps/store",
                },
                {
                  name: "Installed Apps",
                  href: "#apps/installed",
                },
              ],
            }}
          />
        </div>
      </DemoSubSection>

      <DemoSubSection id="navigation-current" title="Current Page">
        <div className="flex w-56 flex-col space-y-1">
          <NavigationItem
            item={{
              name: "Event Types",
              href: "#event-types",
              icon: "link",
              isCurrent: true,
            }}
          />
          <NavigationItem
            item={{
              name: "Availability",
              href: "#availability",
              icon: "clock",
              badge: <Badge variant="blue">3</Badge>,
              isCurrent: true,
            }}
          />

          <NavigationItem
            item={{
              name: "Apps",
              href: "#apps",
              icon: "grid-3x3",
              isCurrent: true,
              child: [
                {
                  name: "App Store",
                  href: "#apps/store",
                  isCurrent: true,
                },
                {
                  name: "Installed Apps",
                  href: "#apps/installed",
                },
              ],
            }}
          />
        </div>
      </DemoSubSection>

      {/* Mobile Only/Desktop Only */}
      <DemoSubSection id="navigation-responsive" title="Responsive">
        <div className="flex w-56 flex-col space-y-1">
          <NavigationItem
            item={{
              name: "Mobile Only",
              href: "#mobile",
              icon: "smartphone",
              onlyMobile: true,
            }}
          />
          <NavigationItem
            item={{
              name: "Desktop Only",
              href: "#desktop",
              icon: "ban",
              onlyDesktop: true,
            }}
          />
        </div>
      </DemoSubSection>

      {/* More on Mobile */}
      <DemoSubSection id="navigation-more" title="More on Mobile">
        <div className="flex w-56 flex-col space-y-1">
          <NavigationItem
            item={{
              name: "Workflows",
              href: "#workflows",
              icon: "zap",
              moreOnMobile: true,
            }}
          />
          <NavigationItem
            item={{
              name: "Insights",
              href: "#insights",
              icon: "chart-bar",
              moreOnMobile: true,
            }}
          />
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
