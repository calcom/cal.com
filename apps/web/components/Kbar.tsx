import { SwitchVerticalIcon } from "@heroicons/react/outline";
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
import { useRouter } from "next/router";
import { Command, CornerDownLeft } from "react-feather";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isMac } from "@calcom/lib/isMac";
import { Tooltip } from "@calcom/ui";

type shortcutArrayType = {
  shortcuts?: string[];
};

export const KBarRoot = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  // grab link to events
  // quick nested actions would be extremely useful
  const actions = [
    // {
    //   id: "toggle-idle",
    //   name: "Test Function",
    //   section: "Status",
    //   shortcut: ["t", "f"],
    //   keywords: "set yourself away bookings",
    //   perform: () => alert("Hello World"),
    // },

    {
      id: "workflows",
      name: "Workflows",
      section: "Workflows",
      shortcut: ["w", "f"],
      keywords: "workflows automation",
      perform: () => router.push("/workflows"),
    },
    {
      id: "event-types",
      name: "Event Types",
      section: "Event Types",
      shortcut: ["e", "t"],
      keywords: "event types",
      perform: () => router.push("/event-types"),
    },
    {
      id: "app-store",
      name: "App Store",
      section: "Apps",
      shortcut: ["a", "s"],
      keywords: "app store",
      perform: () => router.push("/apps"),
    },
    {
      id: "upcoming-bookings",
      name: "Upcoming Bookings",
      section: "Bookings",
      shortcut: ["u", "b"],
      keywords: "upcoming bookings",
      perform: () => router.push("/bookings/upcoming"),
    },
    {
      id: "recurring-bookings",
      name: "Recurring Bookings",
      section: "Bookings",
      shortcut: ["r", "b"],
      keywords: "recurring bookings",
      perform: () => router.push("/bookings/recurring"),
    },
    {
      id: "past-bookings",
      name: "Past Bookings",
      section: "Bookings",
      shortcut: ["p", "b"],
      keywords: "past bookings",
      perform: () => router.push("/bookings/past"),
    },
    {
      id: "cancelled-bookings",
      name: "Cancelled Bookings",
      section: "Bookings",
      shortcut: ["c", "b"],
      keywords: "cancelled bookings",
      perform: () => router.push("/bookings/cancelled"),
    },
    {
      id: "schedule",
      name: "Schedule",
      section: "Availability",
      shortcut: ["s", "a"],
      keywords: "schedule availability",
      perform: () => router.push("/availability"),
    },
    {
      id: "profile",
      name: "Profile",
      section: "Profile Settings",
      shortcut: ["p", "s"],
      keywords: "setting profile",
      perform: () => router.push("/settings/profile"),
    },
    {
      id: "avatar",
      name: "Change Avatar",
      section: "Profile Settings",
      shortcut: ["c", "a"],
      keywords: "remove change modify avatar",
      perform: () => router.push("/settings/profile"),
    },
    {
      id: "timezone",
      name: "Change Timezone",
      section: "Profile Settings",
      shortcut: ["c", "t"],
      keywords: "change modify timezone",
      perform: () => router.push("/settings/profile"),
    },
    {
      id: "brand-color",
      name: "Change Brand Color",
      section: "Profile Settings",
      shortcut: ["b", "c"],
      keywords: "change modify brand color",
      perform: () => router.push("/settings/profile"),
    },
    {
      id: "teams",
      name: "Teams",
      shortcut: ["t", "s"],
      keywords: "add manage modify team",
      perform: () => router.push("/settings/teams"),
    },
    {
      id: "password",
      name: "Change Password",
      section: "Security Settings",
      shortcut: ["c", "p"],
      keywords: "change modify password",
      perform: () => router.push("/settings/security"),
    },
    {
      id: "two-factor",
      name: "Two Factor Authentication",
      section: "Security Settings",
      shortcut: ["t", "f", "a"],
      keywords: "two factor authentication",
      perform: () => router.push("/settings/security"),
    },
    {
      id: "impersonation",
      name: "User Impersonation",
      section: "Security Settings",
      shortcut: ["u", "i"],
      keywords: "user impersonation",
      perform: () => router.push("/settings/security"),
    },
    {
      id: "webhooks",
      name: "Webhook",
      section: "Developer Settings",
      shortcut: ["w", "h"],
      keywords: "webhook automation",
      perform: () => router.push("/settings/developer"),
    },
    {
      id: "api-keys",
      name: "API Keys",
      section: "Developer Settings",
      shortcut: ["a", "p", "i"],
      keywords: "api keys",
      perform: () => router.push("/settings/developer"),
    },
    {
      id: "billing",
      name: "View and Manage Billing",
      section: "Billing",
      shortcut: ["m", "b"],
      keywords: "billing view manage",
      perform: () => router.push("/settings/billing"),
    },
  ];

  return <KBarProvider actions={actions}>{children}</KBarProvider>;
};

export const KBarContent = () => {
  const { t } = useLocale();

  return (
    <KBarPortal>
      <KBarPositioner>
        <KBarAnimator className="z-10 w-full max-w-screen-sm overflow-hidden rounded-sm bg-white shadow-lg">
          <div className="flex items-center justify-center border-b">
            <SearchIcon className="mx-3 h-4 w-4 text-gray-500" />
            <KBarSearch className="w-full rounded-sm py-2.5 focus-visible:outline-none" />
          </div>
          <RenderResults />
          <div className="hidden items-center space-x-1 border-t px-2 py-1.5 text-xs text-gray-500 sm:flex">
            <SwitchVerticalIcon className="h-4 w-4" /> <span className="pr-2">{t("navigate")}</span>
            <CornerDownLeft className="h-4 w-4" />
            <span className="pr-2">{t("open")}</span>
            {isMac ? <Command className="h-3 w-3" /> : "CTRL"}
            <span className="pr-1">+ K </span>
            <span className="pr-2">{t("close")}</span>
          </div>
        </KBarAnimator>
        <div className="z-1 fixed inset-0 bg-gray-600 bg-opacity-75" />
      </KBarPositioner>
    </KBarPortal>
  );
};

export const KBarTrigger = () => {
  const { query } = useKBar();
  return (
    <>
      <Tooltip side="right" content={isMac ? "⌘ + K" : "CTRL + K"}>
        <button
          color="minimal"
          onClick={query.toggle}
          className="group flex text-sm font-medium text-neutral-500  hover:text-neutral-900">
          <SearchIcon className="h-5 w-5 flex-shrink-0 text-neutral-400 group-hover:text-neutral-500" />
        </button>
      </Tooltip>
    </>
  );
};

const DisplayShortcuts = (item: shortcutArrayType) => {
  const shortcuts = item.shortcuts;

  return (
    <span className="space-x-1">
      {shortcuts?.map((shortcut) => {
        return (
          <kbd key={shortcut} className="rounded-sm border bg-white px-2 py-1 text-black hover:bg-gray-100">
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
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <div className="bg-white p-4 text-xs uppercase text-gray-500">{item}</div>
        ) : (
          <div
            // For seeing keyboard up & down navigation in action, we need visual feedback based on "active" prop
            style={{
              background: active ? "rgb(245,245,245)" : "#fff",
              borderLeft: active ? "2px solid black" : "2px solid transparent",
            }}
            className="flex items-center justify-between px-4 py-2.5 text-sm hover:cursor-pointer">
            <span>{item.name}</span>
            <DisplayShortcuts shortcuts={item.shortcut} />
          </div>
        )
      }
    />
  );
}
