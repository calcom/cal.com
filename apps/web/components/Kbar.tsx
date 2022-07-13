import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches,
  useKBar,
} from "kbar";

import { Button } from "@calcom/ui";

const actions = [
  {
    id: "toggle-idle",
    name: "Toggle Idle Status",
    section: "Status",
    shortcut: ["t", "i"],
    keywords: "set yourself away bookings",
    perform: () => alert("Test function call"),
  },
  {
    id: "upcoming-bookings",
    name: "Upcoming Bookings",
    section: "Booking",
    shortcut: ["u", "b"],
    keywords: "upcoming bookings",
    perform: () => (window.location.pathname = "bookings/upcoming"),
  },
  {
    id: "recurring-bookings",
    name: "Recurring Bookings",
    section: "Booking",
    shortcut: ["r", "b"],
    keywords: "recurring bookings",
    perform: () => (window.location.pathname = "bookings/recurring"),
  },
  {
    id: "past-bookings",
    name: "Past Bookings",
    section: "Booking",
    shortcut: ["p", "b"],
    keywords: "past bookings",
    perform: () => (window.location.pathname = "bookings/past"),
  },
  {
    id: "cancelled-bookings",
    name: "Cancelled Bookings",
    section: "Booking",
    shortcut: ["c", "b"],
    keywords: "cancelled bookings",
    perform: () => (window.location.pathname = "bookings/cancelled"),
  },
  {
    id: "schedule",
    name: "Schedule",
    section: "Availability",
    shortcut: ["s", "a"],
    keywords: "schedule availability",
    perform: () => (window.location.pathname = "availability"),
  },
  {
    id: "profile",
    name: "Profile",
    section: "Profile Settings",
    shortcut: ["p", "s"],
    keywords: "setting profile",
    perform: () => (window.location.pathname = "settings"),
  },
  {
    id: "avatar",
    name: "Change Avatar",
    section: "Profile Settings",
    shortcut: ["c", "a"],
    keywords: "remove change modify avatar",
    perform: () => (window.location.pathname = "settings"),
  },
  {
    id: "timezone",
    name: "Change Timezone",
    section: "Profile Settings",
    shortcut: ["c", "t"],
    keywords: "change modify timezone",
    perform: () => (window.location.pathname = "settings"),
  },
  {
    id: "brand-color",
    name: "Change Brand Color",
    section: "Profile Settings",
    shortcut: ["b", "c"],
    keywords: "change modify brand color",
    perform: () => (window.location.pathname = "settings"),
  },
  {
    id: "teams",
    name: "Teams",
    shortcut: ["t", "s"],
    keywords: "add manage modify team",
    perform: () => (window.location.pathname = "settings/teams"),
  },
  {
    id: "password",
    name: "Change Password",
    section: "Security Settings",
    shortcut: ["c", "p"],
    keywords: "change modify password",
    perform: () => (window.location.pathname = "settings/security"),
  },
  {
    id: "two-factor",
    name: "Two Factor Authentication",
    section: "Security Settings",
    shortcut: ["t", "f", "a"],
    keywords: "two factor authentication",
    perform: () => (window.location.pathname = "settings/security"),
  },
  {
    id: "impersonation",
    name: "User Impersonation",
    section: "Security Settings",
    shortcut: ["u", "i"],
    keywords: "user impersonation",
    perform: () => (window.location.pathname = "settings/security"),
  },
  {
    id: "webhooks",
    name: "Webhook",
    section: "Developer Settings",
    shortcut: ["w", "h"],
    keywords: "webhook automation",
    perform: () => (window.location.pathname = "settings/developer"),
  },
  {
    id: "api-keys",
    name: "API Keys",
    section: "Developer Settings",
    shortcut: ["a", "p", "i"],
    keywords: "api keys",
    perform: () => (window.location.pathname = "settings/developer"),
  },
  {
    id: "billing",
    name: "View and Manage Billing",
    section: "Billing",
    shortcut: ["m", "b"],
    keywords: "billing view manage",
    perform: () => (window.location.pathname = "settings/billing"),
  },
];

type shortcutArrayType = {
  shortcuts?: string[];
};

export const KBarRoot = ({ children }: { children: React.ReactNode }) => {
  return <KBarProvider actions={actions}>{children}</KBarProvider>;
};

export const KBarContent = () => {
  return (
    <KBarPortal>
      <KBarPositioner>
        <KBarAnimator>
          <KBarSearch className="min-w-96 rounded-sm px-4 py-2.5 focus-visible:outline focus-visible:outline-black" />
          <RenderResults />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
};

export const KBarTrigger = () => {
  const { query } = useKBar();

  return <Button onClick={query.toggle}>Search</Button>;
};

const DisplayShortcuts = (item: shortcutArrayType) => {
  const shortcuts = item.shortcuts;

  return (
    <span className="space-x-1">
      {shortcuts?.map((shortcut) => {
        return (
          <kbd key={shortcut} className="rounded-sm bg-gray-700 px-2 py-1 text-white">
            {shortcut}
          </kbd>
        );
      })}
    </span>
  );
};

function RenderResults() {
  const { results } = useMatches();
  console.log(results);

  return (
    <KBarResults
      items={results}
      onRender={({ item }) =>
        typeof item === "string" ? (
          <div className="bg-white p-4 text-xs uppercase text-gray-500">{item}</div>
        ) : (
          <div className="flex items-center justify-between bg-white px-4 py-2.5 text-sm hover:cursor-pointer hover:border-l-2 hover:border-black hover:bg-gray-100">
            <span>{item.name}</span>
            <DisplayShortcuts shortcuts={item.shortcut} />
          </div>
        )
      }
    />
  );
}
