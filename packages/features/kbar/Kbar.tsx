import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useKBar,
  useMatches,
} from "kbar";
import { useRouter } from "next/router";
import { useMemo } from "react";

import { appStoreMetadata } from "@calcom/app-store/apps.metadata.generated";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isMac } from "@calcom/lib/isMac";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { Icon, Tooltip } from "@calcom/ui";

type shortcutArrayType = {
  shortcuts?: string[];
};

type EventTypeGroups = RouterOutputs["viewer"]["eventTypes"]["getByViewer"]["eventTypeGroups"];
type EventTypeGroup = EventTypeGroups[number];
type EventType = EventTypeGroup["eventTypes"][number];

type KBarAction = {
  perform: () => Promise<boolean>;
  id: string;
  name: string;
  section: string;
  keywords: string;
};

const getApps = Object.values(appStoreMetadata).map(({ name, slug }) => ({
  id: slug,
  name,
  section: "Installable Apps",
  keywords: `app ${name}`,
}));

export const KBarRoot = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { data } = trpc.viewer.eventTypes.getByViewer.useQuery();

  // grab link to events
  // quick nested actions would be extremely useful
  const appStoreActions = useMemo(
    () => getApps.map((item) => ({ ...item, perform: () => router.push(`/apps/${item.id}`) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  if (!data) return null;

  const eventTypes =
    data?.eventTypeGroups.reduce((acc: EventType[], group: EventTypeGroup): EventType[] => {
      acc.push(...group.eventTypes);
      return acc;
    }, [] as EventType[]) || [];

  const eventTypeActions =
    eventTypes.map(
      (item: EventType): KBarAction => ({
        id: `event-type-${item.id}`,
        name: item.title,
        section: "event_types_page_title",
        keywords: "event types",
        perform: () => router.push(`/event-types/${item.id}`),
      })
    ) || [];

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
      name: "workflows",
      section: "workflows",
      shortcut: ["w", "f"],
      keywords: "workflows automation",
      perform: () => router.push("/workflows"),
    },
    {
      id: "event-types",
      name: "event_types_page_title",
      section: "event_types_page_title",
      shortcut: ["e", "t"],
      keywords: "event types",
      perform: () => router.push("/event-types"),
    },
    {
      id: "app-store",
      name: "app_store",
      section: "apps",
      shortcut: ["a", "s"],
      keywords: "app store",
      perform: () => router.push("/apps"),
    },
    {
      id: "upcoming-bookings",
      name: "upcoming",
      section: "bookings",
      shortcut: ["u", "b"],
      keywords: "upcoming bookings",
      perform: () => router.push("/bookings/upcoming"),
    },
    {
      id: "recurring-bookings",
      name: "recurring",
      section: "bookings",
      shortcut: ["r", "b"],
      keywords: "recurring bookings",
      perform: () => router.push("/bookings/recurring"),
    },
    {
      id: "past-bookings",
      name: "past",
      section: "bookings",
      shortcut: ["p", "b"],
      keywords: "past bookings",
      perform: () => router.push("/bookings/past"),
    },
    {
      id: "cancelled-bookings",
      name: "cancelled",
      section: "bookings",
      shortcut: ["c", "b"],
      keywords: "cancelled bookings",
      perform: () => router.push("/bookings/cancelled"),
    },
    {
      id: "schedule",
      name: "availability",
      section: "availability",
      shortcut: ["s", "a"],
      keywords: "schedule availability",
      perform: () => router.push("/availability"),
    },
    {
      id: "profile",
      name: "profile",
      section: "profile",
      shortcut: ["p", "s"],
      keywords: "setting profile",
      perform: () => router.push("/settings/my-account/profile"),
    },
    {
      id: "avatar",
      name: "change_avatar",
      section: "profile",
      shortcut: ["c", "a"],
      keywords: "remove change modify avatar",
      perform: () => router.push("/settings/my-account/profile"),
    },
    {
      id: "timezone",
      name: "timezone",
      section: "profile",
      shortcut: ["c", "t"],
      keywords: "change modify timezone",
      perform: () => router.push("/settings/my-account/general"),
    },
    {
      id: "brand-color",
      name: "brand_color",
      section: "profile",
      shortcut: ["b", "c"],
      keywords: "change modify brand color",
      perform: () => router.push("/settings/my-account/appearance"),
    },
    {
      id: "teams",
      name: "teams",
      shortcut: ["t", "s"],
      keywords: "add manage modify team",
      perform: () => router.push("/settings/teams"),
    },
    {
      id: "password",
      name: "change_password",
      section: "security",
      shortcut: ["c", "p"],
      keywords: "change modify password",
      perform: () => router.push("/settings/security/password"),
    },
    {
      id: "two-factor",
      name: "two_factor_auth",
      section: "security",
      shortcut: ["t", "f", "a"],
      keywords: "two factor authentication",
      perform: () => router.push("/settings/security/two-factor-auth"),
    },
    {
      id: "impersonation",
      name: "user_impersonation_heading",
      section: "security",
      shortcut: ["u", "i"],
      keywords: "user impersonation",
      perform: () => router.push("/settings/security/impersonation"),
    },
    {
      id: "webhooks",
      name: "Webhooks",
      section: "developer",
      shortcut: ["w", "h"],
      keywords: "webhook automation",
      perform: () => router.push("/settings/developer/webhooks"),
    },
    {
      id: "api-keys",
      name: "api_keys",
      section: "developer",
      shortcut: ["a", "p", "i"],
      keywords: "api keys",
      perform: () => router.push("/settings/developer/api-keys"),
    },
    {
      id: "billing",
      name: "manage_billing",
      section: "billing",
      shortcut: ["m", "b"],
      keywords: "billing view manage",
      perform: () => router.push("/settings/billing"),
    },
    ...appStoreActions,
    ...eventTypeActions,
  ];

  return <KBarProvider actions={actions}>{children}</KBarProvider>;
};

export const KBarContent = () => {
  const { t } = useLocale();

  return (
    <KBarPortal>
      <KBarPositioner>
        <KBarAnimator className="z-10 w-full max-w-screen-sm overflow-hidden rounded-md bg-white shadow-lg">
          <div className="flex items-center justify-center border-b">
            <Icon.FiSearch className="mx-3 h-4 w-4 text-gray-500" />
            <KBarSearch
              defaultPlaceholder={t("kbar_search_placeholder")}
              className="w-full rounded-sm py-2.5 focus-visible:outline-none"
            />
          </div>
          <RenderResults />
          <div className="hidden items-center space-x-1 border-t px-2 py-1.5 text-xs text-gray-500 sm:flex">
            <Icon.FiArrowUp className="h-4 w-4" />
            <Icon.FiArrowDown className="h-4 w-4" /> <span className="pr-2">{t("navigate")}</span>
            <Icon.FiCornerDownLeft className="h-4 w-4" />
            <span className="pr-2">{t("open")}</span>
            {isMac ? <Icon.FiCommand className="h-3 w-3" /> : "CTRL"}
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
  return query ? (
    <>
      <Tooltip side="right" content={isMac ? "⌘ + K" : "CTRL + K"}>
        <button
          color="minimal"
          onClick={query.toggle}
          className="group flex rounded-md py-2 px-3 text-sm font-medium hover:bg-gray-100 lg:p-1 lg:hover:bg-gray-200 lg:hover:text-neutral-900">
          <Icon.FiSearch className="h-4 w-4 flex-shrink-0 text-inherit" />
        </button>
      </Tooltip>
    </>
  ) : null;
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
  const { t } = useLocale();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <div className="bg-white p-4 text-xs uppercase text-gray-500">{t(item)}</div>
        ) : (
          <div
            // For seeing keyboard up & down navigation in action, we need visual feedback based on "active" prop
            style={{
              background: active ? "rgb(245,245,245)" : "#fff",
              borderLeft: active ? "2px solid black" : "2px solid transparent",
            }}
            className="flex items-center justify-between px-4 py-2.5 text-sm hover:cursor-pointer">
            <span>{t(item.name)}</span>
            <DisplayShortcuts shortcuts={item.shortcut} />
          </div>
        )
      }
    />
  );
}
