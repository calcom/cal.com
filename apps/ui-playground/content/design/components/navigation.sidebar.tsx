"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { NavigationItem } from "@calcom/ui";

export const SidebarExample: React.FC = () => {
  const [isDeelExpanded, setIsDeelExpanded] = useState(true);

  return (
    <RenderComponentWithSnippet>
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
            isExpanded: true,
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
        <div className="mt-auto" />
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
      <div className="bg-muted border-muted flex w-60 flex-col border p-3">
        <NavigationItem
          item={{
            name: "Back",
            href: "#back",
            icon: "chevron-left",
          }}
        />
        <NavigationItem
          item={{
            name: "Appearance",
            href: "#appearance",
          }}
        />
        <NavigationItem
          item={{
            name: "Out of office",
            href: "#out-of-office",
          }}
        />
        <NavigationItem
          item={{
            name: "Security",
            icon: "shield",
            isExpanded: true,
            child: [
              {
                name: "Password",
                href: "#password",
              },
              {
                name: "Impersonation",
                href: "#impersonation",
              },
              {
                name: "Two factor auth",
                href: "#2fa",
              },
            ],
          }}
        />

        <NavigationItem
          item={{
            name: "Billing",
            icon: "credit-card",
            isExpanded: true,
            child: [
              {
                name: "Manage billing",
                href: "#manage-billing",
              },
            ],
          }}
        />

        <NavigationItem
          item={{
            name: "Developer",
            icon: "code",
            isExpanded: true,
            child: [
              {
                name: "Webhooks",
                href: "#webhooks",
              },
              {
                name: "API Keys",
                href: "#api-keys",
              },
            ],
          }}
        />

        <NavigationItem
          item={{
            name: "Teams",
            icon: "users",
          }}
        />
        <NavigationItem
          item={{
            name: "Deel",
            icon: isDeelExpanded ? "chevron-down" : "chevron-right",
            isExpanded: isDeelExpanded,
            onToggle: () => setIsDeelExpanded(!isDeelExpanded),
            child: [
              { name: "Profile", href: "#profile" },
              { name: "Members", href: "#members" },
              { name: "Event Types", href: "#event-types" },
              { name: "Appearance", href: "#appearance" },
              { name: "Billing", href: "#billing" },
              { name: "Booking Limits", href: "#booking-limits" },
              { name: "Attributes", href: "#attributes" },
              { name: "Segments", href: "#segments", isCurrent: true },
            ],
          }}
        />

        <NavigationItem
          item={{
            name: "Add team",
            href: "#add-team",
            icon: "plus",
          }}
        />
      </div>
    </RenderComponentWithSnippet>
  );
};
