import type { Action } from "kbar";
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
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isMac } from "@calcom/lib/isMac";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

type ShortcutArrayType = {
  shortcuts?: string[];
};

type ActionConfig = {
  id: string;
  name: string;
  section?: string;
  shortcut?: string[];
  keywords: string;
  href: string;
};

type AppAction = {
  id: string;
  name: string;
  section: string;
  keywords: string;
};

const getApps: AppAction[] = Object.values(appStoreMetadata).map(({ name, slug }) => ({
  id: slug,
  name,
  section: "Installable Apps",
  keywords: `app ${name}`,
}));

const KBAR_ACTION_CONFIGS: ActionConfig[] = [
  { id: "workflows", name: "workflows", section: "workflows", shortcut: ["w", "f"], keywords: "workflows automation", href: "/workflows" },
  { id: "event-types", name: "event_types_page_title", section: "event_types_page_title", shortcut: ["e", "t"], keywords: "event types", href: "/event-types" },
  { id: "app-store", name: "app_store", section: "apps", shortcut: ["a", "s"], keywords: "app store", href: "/apps" },
  { id: "upcoming-bookings", name: "upcoming", section: "bookings", shortcut: ["u", "b"], keywords: "upcoming bookings", href: "/bookings/upcoming" },
  { id: "recurring-bookings", name: "recurring", section: "bookings", shortcut: ["r", "b"], keywords: "recurring bookings", href: "/bookings/recurring" },
  { id: "past-bookings", name: "past", section: "bookings", shortcut: ["p", "b"], keywords: "past bookings", href: "/bookings/past" },
  { id: "cancelled-bookings", name: "cancelled", section: "bookings", shortcut: ["c", "b"], keywords: "cancelled bookings", href: "/bookings/cancelled" },
  { id: "schedule", name: "availability", section: "availability", shortcut: ["s", "a"], keywords: "schedule availability", href: "/availability" },
  { id: "profile", name: "profile", section: "profile", shortcut: ["p", "s"], keywords: "setting profile", href: "/settings/my-account/profile" },
  { id: "avatar", name: "change_avatar", section: "profile", shortcut: ["c", "a"], keywords: "remove change modify avatar", href: "/settings/my-account/profile" },
  { id: "timezone", name: "timezone", section: "profile", shortcut: ["c", "t"], keywords: "change modify timezone", href: "/settings/my-account/general" },
  { id: "brand-color", name: "brand_color", section: "profile", shortcut: ["b", "c"], keywords: "change modify brand color", href: "/settings/my-account/appearance" },
  { id: "teams", name: "teams", shortcut: ["t", "s"], keywords: "add manage modify team", href: "/settings/teams" },
  { id: "password", name: "change_password", section: "security", shortcut: ["c", "p"], keywords: "change modify password", href: "/settings/security/password" },
  { id: "two-factor", name: "two_factor_auth", section: "security", shortcut: ["t", "f", "a"], keywords: "two factor authentication", href: "/settings/security/two-factor-auth" },
  { id: "impersonation", name: "user_impersonation_heading", section: "security", shortcut: ["u", "i"], keywords: "user impersonation", href: "/settings/security/impersonation" },
  { id: "license", name: "choose_a_license", section: "admin", shortcut: ["u", "l"], keywords: "license", href: "/auth/setup?step=1" },
  { id: "webhooks", name: "Webhooks", section: "developer", shortcut: ["w", "h"], keywords: "webhook automation", href: "/settings/developer/webhooks" },
  { id: "api-keys", name: "api_keys", section: "developer", shortcut: ["a", "p", "i"], keywords: "api keys", href: "/settings/developer/api-keys" },
  { id: "billing", name: "manage_billing", section: "billing", shortcut: ["m", "b"], keywords: "billing view manage", href: "/settings/billing" },
];

function buildKbarActions(push: (href: string) => void): Action[] {
  const staticActions: Action[] = KBAR_ACTION_CONFIGS.map((config) => ({
    id: config.id,
    name: config.name,
    section: config.section,
    shortcut: config.shortcut,
    keywords: config.keywords,
    perform: () => push(config.href),
  }));

  const appStoreActions: Action[] = getApps.map((item) => ({
    ...item,
    perform: () => push(`/apps/${item.id}`),
  }));

  return [...staticActions, ...appStoreActions];
}

function useEventTypesAction(): void {
  const router = useRouter();
  const { data } = trpc.viewer.eventTypes.getEventTypesFromGroup.useInfiniteQuery(
    {
      limit: 10,
      group: { teamId: null, parentId: null },
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 1 * 60 * 60 * 1000,
      getNextPageParam: (lastPage: { nextCursor?: number | null }) => lastPage.nextCursor,
    }
  );

  const eventTypeActions: Action[] =
    data?.pages?.flatMap((page) => {
      return (
        page?.eventTypes?.map((item) => ({
          id: `event-type-${item.id}`,
          name: item.title,
          section: "event_types_page_title",
          keywords: "event types",
          perform: () => router.push(`/event-types/${item.id}`),
        })) ?? []
      );
    }) ?? [];

  let actions: Action[] = [];
  if (eventTypeActions.length > 0) {
    actions = eventTypeActions;
  }

  useRegisterActions(actions);
}

const KBarRoot = ({ children }: { children: ReactNode }): JSX.Element => {
  const router = useRouter();
  const actions = useMemo(() => buildKbarActions(router.push), [router.push]);

  return <KBarProvider actions={actions}>{children}</KBarProvider>;
};

function CommandKey(): JSX.Element {
  if (isMac) {
    return <Icon name="command" className="h-3 w-3" />;
  }
  return <>CTRL</>;
}

const KBarContent = (): JSX.Element => {
  const { t } = useLocale();
  useEventTypesAction();

  return (
    <KBarPortal>
      <KBarPositioner className="overflow-scroll">
        <KBarAnimator className="bg-default max-w-(--breakpoint-sm) z-10 w-full overflow-hidden rounded-md shadow-lg">
          <div className="border-subtle flex items-center justify-center border-b">
            <Icon name="search" className="text-default mx-3 h-4 w-4" />
            <KBarSearch
              defaultPlaceholder={t("kbar_search_placeholder")}
              className="bg-default placeholder:text-subtle text-default w-full rounded-sm border-0 py-2.5 px-0 focus:ring-0 focus-visible:outline-none"
            />
          </div>
          <RenderResults />
          <div className="text-subtle border-subtle hidden items-center space-x-1 border-t px-2 py-1.5 text-xs sm:flex">
            <Icon name="arrow-up" className="h-4 w-4" />
            <Icon name="arrow-down" className="h-4 w-4" /> <span className="pr-2">{t("navigate")}</span>
            <Icon name="corner-down-left" className="h-4 w-4" />
            <span className="pr-2">{t("open")}</span>
            <CommandKey />
            <span className="pr-1">+ K </span>
            <span className="pr-2">{t("close")}</span>
          </div>
        </KBarAnimator>
        <div className="z-1 fixed inset-0 bg-neutral-800/70" />
      </KBarPositioner>
    </KBarPortal>
  );
};

function getTooltipContent(): string {
  if (isMac) {
    return "⌘ + K";
  }
  return "CTRL + K";
}

const KBarTrigger = (): JSX.Element | null => {
  const { query } = useKBar();

  if (!query) {
    return null;
  }

  return (
    <Tooltip side="right" content={getTooltipContent()}>
      <button
        color="minimal"
        onClick={query.toggle}
        className="text-default hover:bg-subtle todesktop:hover:!bg-transparent lg:hover:bg-emphasis lg:hover:text-emphasis group flex rounded-md px-3 py-2 text-sm font-medium transition lg:px-2">
        <Icon name="search" className="h-4 w-4 shrink-0 text-inherit" />
      </button>
    </Tooltip>
  );
};

function DisplayShortcuts(item: ShortcutArrayType): JSX.Element {
  const shortcuts = item.shortcuts;

  return (
    <span className="space-x-1">
      {shortcuts?.map((shortcut) => {
        return (
          <kbd
            key={shortcut}
            className="bg-default hover:bg-subtle text-emphasis rounded-sm border px-2 py-1 transition">
            {shortcut}
          </kbd>
        );
      })}
    </span>
  );
}

type RenderItemProps = {
  item: string | Action;
  active: boolean;
};

function renderResultItem(item: string | Action, active: boolean, t: (key: string) => string): JSX.Element {
  if (typeof item === "string") {
    return <div className="bg-default text-emphasis p-4 text-xs font-bold uppercase">{t(item)}</div>;
  }

  let background = "var(--cal-bg-default)";
  let borderLeft = "2px solid transparent";
  if (active) {
    background = "var(--cal-bg-subtle)";
    borderLeft = "2px solid var(--cal-border)";
  }

  return (
    <div
      style={{ background, borderLeft, color: "var(--cal-text)" }}
      className="flex items-center justify-between px-4 py-2.5 text-sm transition hover:cursor-pointer">
      <span>{t(item.name)}</span>
      <DisplayShortcuts shortcuts={item.shortcut} />
    </div>
  );
}

function RenderResults(): JSX.Element {
  const { results } = useMatches();
  const { t } = useLocale();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }: RenderItemProps): JSX.Element => renderResultItem(item, active, t)}
    />
  );
}

export { KBarRoot, KBarContent, KBarTrigger };
