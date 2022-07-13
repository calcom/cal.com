import { SearchIcon } from "@heroicons/react/solid";
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

import { isMac } from "@calcom/lib/isMac";
import { Tooltip } from "@calcom/ui";

// grab link to events
// quick nested actions would be extremely useful
const actions = [
  {
    id: "toggle-idle",
    name: "Test Function",
    section: "Status",
    shortcut: ["t", "f"],
    keywords: "set yourself away bookings",
    perform: () => alert("Hello World"),
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
        <KBarAnimator className="shadow-lg">
          <KBarSearch className="min-w-96 rounded-sm px-4 py-2.5 focus-visible:outline-none" />
          <RenderResults />
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
};

export const KBarTrigger = () => {
  const { query } = useKBar();

  return (
    <div className="flex">
      <button
        color="minimal"
        onClick={query.toggle}
        className="group flex w-full items-center rounded-sm px-2 py-2 text-sm font-medium text-neutral-500 hover:bg-gray-50 hover:text-neutral-900">
        <span className="h-5 w-5 flex-shrink-0 text-neutral-400 group-hover:text-neutral-500 ltr:mr-3 rtl:ml-3">
          <SearchIcon />
        </span>
        <Tooltip content={isMac ? "⌘ + K" : "CTRL + K"}>
          <span className="hidden lg:inline">Quick Find</span>
        </Tooltip>
      </button>
    </div>
  );
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
          <div className="flex items-center justify-between border-l-2 border-transparent bg-white px-4 py-2.5 text-sm hover:cursor-pointer hover:border-black hover:bg-gray-100">
            <span>{item.name}</span>
            <DisplayShortcuts shortcuts={item.shortcut} />
          </div>
        )
      }
    />
  );
}
