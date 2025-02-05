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

      {/* Full Navigation Example with Labels */}
      <DemoSubSection id="navigation-full" title="Full Navigation Example">
        <div className="bg-muted border-muted flex w-60 flex-col border p-3">
          <NavigationItem
            item={{
              name: "Event types",
              href: "#event-types",
              icon: "link",
            }}
          />
          <NavigationItem
            item={{
              name: "Bookings",
              href: "#bookings",
              icon: "users",
              isCurrent: true,
              child: [
                { name: "Label", href: "#label-1" },
                { name: "Label", href: "#label-2" },
                { name: "Label", href: "#label-3" },
                { name: "Label", href: "#label-4" },
              ],
            }}
          />
          <NavigationItem
            item={{
              name: "Insights",
              href: "#insights",
              icon: "chart-line",
            }}
          />
          <NavigationItem
            item={{
              name: "Routing forms",
              href: "#routing-forms",
              icon: "shuffle",
            }}
          />
          <NavigationItem
            item={{
              name: "Workflows",
              href: "#workflows",
              icon: "zap",
            }}
          />
          <div className="text-subtle mt-4 px-2 text-sm">Manage</div>
          <NavigationItem
            item={{
              name: "Members",
              href: "#members",
              icon: "users",
            }}
          />
          <NavigationItem
            item={{
              name: "Apps",
              href: "#apps",
              icon: "grid-3x3",
            }}
          />
          <NavigationItem
            item={{
              name: "Availability",
              href: "#availability",
              icon: "clock",
            }}
          />
          <div className="mt-8" />
          <NavigationItem
            item={{
              name: "Help",
              href: "#help",
              icon: "circle-help",
            }}
          />
          <NavigationItem
            item={{
              name: "Settings",
              href: "#settings",
              icon: "settings",
            }}
          />
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
