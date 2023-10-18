import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useKBar,
  useMatches,
  useRegisterActions,
} from "kbar";
import type { Action } from "kbar";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isMac } from "@calcom/lib/isMac";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Tooltip } from "@calcom/ui";
import { Search, ArrowUp, ArrowDown, CornerDownLeft, Command } from "@calcom/ui/components/icon";

type shortcutArrayType = {
  shortcuts?: string[];
};

type EventTypeGroups = RouterOutputs["viewer"]["eventTypes"]["getByViewer"]["eventTypeGroups"];
type EventTypeGroup = EventTypeGroups[number];

const getApps = Object.values(appStoreMetadata).map(({ name, slug }) => ({
  id: slug,
  name,
  section: "Installable Apps",
  keywords: `app ${name}`,
}));

const useEventTypesAction = () => {
  const router = useRouter();
  const { data } = trpc.viewer.eventTypes.getByViewer.useQuery();
  const eventTypeActions = data?.eventTypeGroups.reduce<Action[]>((acc: Action[], group: EventTypeGroup) => {
    const item: Action[] = group.eventTypes.map((item) => ({
      id: `event-type-${item.id}`,
      name: item.title,
      section: "event_types_page_title",
      keywords: "event types",
      perform: () => router.push(`/event-types/${item.id}`),
    }));
    acc.push(...item);
    return acc;
  }, []);

  const actions = eventTypeActions?.length ? eventTypeActions : [];

  return useRegisterActions(actions);
};

export const KBarRoot = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  // grab link to events
  // quick nested actions would be extremely useful

  const actions = useMemo(() => {
    const appStoreActions = getApps.map((item) => ({
      ...item,
      perform: () => router.push(`/apps/${item.id}`),
    }));
    return [
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
        id: "license",
        name: "choose_a_license",
        section: "admin",
        shortcut: ["u", "l"],
        keywords: "license",
        perform: () => router.push("/auth/setup?step=1"),
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
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <KBarProvider actions={actions}>{children}</KBarProvider>;
};

export const KBarContent = () => {
  const { t } = useLocale();
  useEventTypesAction();
  return (
    <KBarPortal>
      <KBarPositioner>
        <KBarAnimator className="bg-default z-10 w-full max-w-screen-sm overflow-hidden rounded-md shadow-lg">
          <div className="border-subtle flex items-center justify-center border-b">
            <Search className="text-default mx-3 h-4 w-4" />
            <KBarSearch
              defaultPlaceholder={t("kbar_search_placeholder")}
              className="bg-default placeholder:text-subtle text-default w-full rounded-sm py-2.5 focus-visible:outline-none"
            />
          </div>
          <RenderResults />
          <div className="text-subtle border-subtle hidden items-center space-x-1 border-t px-2 py-1.5 text-xs sm:flex">
            <ArrowUp className="h-4 w-4" />
            <ArrowDown className="h-4 w-4" /> <span className="pr-2">{t("navigate")}</span>
            <CornerDownLeft className="h-4 w-4" />
            <span className="pr-2">{t("open")}</span>
            {isMac ? <Command className="h-3 w-3" /> : "CTRL"}
            <span className="pr-1">+ K </span>
            <span className="pr-2">{t("close")}</span>
          </div>
        </KBarAnimator>
        <div className="z-1 fixed inset-0 bg-neutral-800 bg-opacity-70" />
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
          className="text-default hover:bg-subtle lg:hover:bg-emphasis lg:hover:text-emphasis group flex rounded-md px-3 py-2 text-sm font-medium transition lg:px-2">
          <Search className="h-4 w-4 flex-shrink-0 text-inherit" />
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
          <kbd
            key={shortcut}
            className="bg-default hover:bg-subtle text-emphasis rounded-sm border px-2 py-1">
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
          <div className="bg-default text-emphasis p-4 text-xs font-bold uppercase">{t(item)}</div>
        ) : (
          <div
            // For seeing keyboard up & down navigation in action, we need visual feedback based on "active" prop
            style={{
              background: active ? "var(--cal-bg-subtle)" : `var(--cal-bg-default)`,
              borderLeft: active ? "2px solid var(--cal-border-default)" : "2px solid transparent",
              color: "var(--cal-text)",
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
