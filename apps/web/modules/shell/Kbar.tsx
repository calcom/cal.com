import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isMac } from "@calcom/lib/isMac";
import { trpc } from "@calcom/trpc/react";
import { Tooltip } from "@calcom/ui/components/tooltip";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CommandIcon,
  CornerDownLeftIcon,
  ExternalLinkIcon,
  SearchIcon,
} from "@coss/ui/icons";
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
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

const CROW_API_URL = process.env.NEXT_PUBLIC_CROW_API_URL ?? "";
const CROW_PRODUCT_ID = process.env.NEXT_PUBLIC_CROW_PRODUCT_ID ?? "";


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
  {
    id: "workflows",
    name: "workflows",
    section: "workflows",
    shortcut: ["w", "f"],
    keywords: "workflows automation",
    href: "/workflows",
  },
  {
    id: "event-types",
    name: "event_types_page_title",
    section: "event_types_page_title",
    shortcut: ["e", "t"],
    keywords: "event types",
    href: "/event-types",
  },
  {
    id: "app-store",
    name: "app_store",
    section: "apps",
    shortcut: ["a", "s"],
    keywords: "app store",
    href: "/apps",
  },
  {
    id: "upcoming-bookings",
    name: "upcoming",
    section: "bookings",
    shortcut: ["u", "b"],
    keywords: "upcoming bookings",
    href: "/bookings/upcoming",
  },
  {
    id: "recurring-bookings",
    name: "recurring",
    section: "bookings",
    shortcut: ["r", "b"],
    keywords: "recurring bookings",
    href: "/bookings/recurring",
  },
  {
    id: "past-bookings",
    name: "past",
    section: "bookings",
    shortcut: ["p", "b"],
    keywords: "past bookings",
    href: "/bookings/past",
  },
  {
    id: "cancelled-bookings",
    name: "cancelled",
    section: "bookings",
    shortcut: ["c", "b"],
    keywords: "cancelled bookings",
    href: "/bookings/cancelled",
  },
  {
    id: "schedule",
    name: "availability",
    section: "availability",
    shortcut: ["s", "a"],
    keywords: "schedule availability",
    href: "/availability",
  },
  {
    id: "profile",
    name: "profile",
    section: "profile",
    shortcut: ["p", "s"],
    keywords: "setting profile",
    href: "/settings/my-account/profile",
  },
  {
    id: "avatar",
    name: "change_avatar",
    section: "profile",
    shortcut: ["c", "a"],
    keywords: "remove change modify avatar",
    href: "/settings/my-account/profile",
  },
  {
    id: "timezone",
    name: "timezone",
    section: "profile",
    shortcut: ["c", "t"],
    keywords: "change modify timezone",
    href: "/settings/my-account/general",
  },
  {
    id: "brand-color",
    name: "brand_color",
    section: "profile",
    shortcut: ["b", "c"],
    keywords: "change modify brand color",
    href: "/settings/my-account/appearance",
  },
  {
    id: "teams",
    name: "teams",
    shortcut: ["t", "s"],
    keywords: "add manage modify team",
    href: "/settings/teams",
  },
  {
    id: "password",
    name: "change_password",
    section: "security",
    shortcut: ["c", "p"],
    keywords: "change modify password",
    href: "/settings/security/password",
  },
  {
    id: "two-factor",
    name: "two_factor_auth",
    section: "security",
    shortcut: ["t", "f", "a"],
    keywords: "two factor authentication",
    href: "/settings/security/two-factor-auth",
  },
  {
    id: "impersonation",
    name: "user_impersonation_heading",
    section: "security",
    shortcut: ["u", "i"],
    keywords: "user impersonation",
    href: "/settings/security/impersonation",
  },
  {
    id: "license",
    name: "choose_a_license",
    section: "admin",
    shortcut: ["u", "l"],
    keywords: "license",
    href: "/auth/setup?step=1",
  },
  {
    id: "webhooks",
    name: "Webhooks",
    section: "developer",
    shortcut: ["w", "h"],
    keywords: "webhook automation",
    href: "/settings/developer/webhooks",
  },
  {
    id: "api-keys",
    name: "api_keys",
    section: "developer",
    shortcut: ["a", "p", "i"],
    keywords: "api keys",
    href: "/settings/developer/api-keys",
  },
  {
    id: "billing",
    name: "manage_billing",
    section: "billing",
    shortcut: ["m", "b"],
    keywords: "billing view manage",
    href: "/settings/billing",
  },
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
      limit: 100,
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

  useRegisterActions(actions, [data]);
}


function useUpcomingBookingsAction(): void {
  const router = useRouter();
  const session = useSession();
  const userId = session.data?.user.id;

  const { data } = trpc.viewer.bookings.get.useQuery(
    {
      filters: {
        status: "upcoming",
        afterStartDate: dayjs().startOf("day").toISOString(),
        userIds: userId ? [userId] : undefined,
      },
      limit: 100,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      enabled: !!userId,
    }
  );

  const bookingActions: Action[] = useMemo(() => {
    if (!data?.bookings) return [];

    return data.bookings.map((booking) => {
      const startTime = dayjs(booking.startTime);
      const formattedDate = startTime.format("MMM D");
      const formattedTime = startTime.format("h:mm A");
      const attendeeNames = (booking.attendees ?? []).map((a) => a.name).join(" ");

      return {
        id: `booking-${booking.uid}`,
        name: `${booking.title} - ${formattedDate} ${formattedTime}`,
        section: { name: "upcoming", priority: 1 },
        keywords: `booking ${booking.title} ${attendeeNames}`,
        perform: () => router.push(`/booking/${booking.uid}`),
      };
    });
  }, [data?.bookings, router]);

  useRegisterActions(bookingActions, [bookingActions]);
}

const KBarRoot = ({ children }: { children: ReactNode }): JSX.Element => {
  const router = useRouter();
  const actions = useMemo(() => buildKbarActions(router.push), [router.push]);

  return <KBarProvider actions={actions}>{children}</KBarProvider>;
};

function CommandKey(): JSX.Element {
  if (isMac) {
    return <CommandIcon className="h-3 w-3" />;
  }
  return <>CTRL</>;
}

const KBarContent = (): JSX.Element => {
  const { t } = useLocale();

  return (
    <KBarPortal>
      <KBarPositioner className="overflow-scroll">
        <KBarAnimator className="z-10 w-full max-w-(--breakpoint-sm) overflow-hidden rounded-md bg-default shadow-lg">
          <div className="flex items-center justify-center border-subtle border-b">
            <SearchIcon className="mx-3 h-4 w-4 text-default" />
            <KBarSearch
              defaultPlaceholder={t("kbar_search_placeholder")}
              className="w-full rounded-sm border-0 bg-default px-0 py-2.5 text-default placeholder:text-subtle focus:ring-0 focus-visible:outline-none"
            />
          </div>
          <RenderResults />
          <div className="hidden items-center space-x-1 border-subtle border-t px-2 py-1.5 text-subtle text-xs sm:flex">
            <ArrowUpIcon className="h-4 w-4" />
            <ArrowDownIcon className="h-4 w-4" /> <span className="pr-2">{t("navigate")}</span>
            <CornerDownLeftIcon className="h-4 w-4" />
            <span className="pr-2">{t("open")}</span>
            <CommandKey />
            <span className="pr-1">+ K </span>
            <span className="pr-2">{t("close")}</span>
          </div>
        </KBarAnimator>
        <div className="fixed inset-0 z-1 bg-neutral-800/70" />
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
        className="todesktop:hover:!bg-transparent group flex rounded-md px-3 py-2 font-medium text-default text-sm transition hover:bg-subtle lg:px-2 lg:hover:bg-emphasis lg:hover:text-emphasis">
        <SearchIcon className="h-4 w-4 shrink-0 text-inherit" />
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
            className="rounded-sm border bg-default px-2 py-1 text-emphasis transition hover:bg-subtle">
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
    return <div className="bg-default p-4 font-bold text-emphasis text-xs uppercase">{t(item)}</div>;
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

type CrowSSEEvent = {
  type: string;
  content?: string;
  tool_name?: string;
  display_name?: string;
  arguments?: Record<string, unknown>;
  conversation_id?: string;
  links?: string[];
  result?: unknown;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  href: string | null;
  sources?: string[];
};

type CrowFallbackState = {
  mode: "search" | "chat";
  messages: ChatMessage[];
  conversationId: string | null;
  streaming: boolean;
  checkingDocs: boolean;
  error: boolean;
};

// Minimal markdown renderer — no external deps, handles bold, inline code, links, and lists.
function renderInline(text: string): JSX.Element {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static split segments
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : part.startsWith("`") && part.endsWith("`") ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static split segments
          <code key={i} className="rounded bg-subtle px-1 font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        ) : part.startsWith("[") ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static split segments
          (() => {
            const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            return m ? (
              <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer"
                className="underline transition hover:text-default">
                {m[1]}
              </a>
            ) : (
              <Fragment key={i}>{part}</Fragment>
            );
          })()
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static split segments
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

function renderMarkdown(text: string): JSX.Element {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const orderedMatch = line.match(/^(\d+)\.\s(.+)/);
        if (orderedMatch) {
          // biome-ignore lint/suspicious/noArrayIndexKey: line index is stable
          return (
            <div key={i} className="ml-3">
              {orderedMatch[1]}. {renderInline(orderedMatch[2])}
            </div>
          );
        }
        const bulletMatch = line.match(/^[-*]\s(.+)/);
        if (bulletMatch) {
          // biome-ignore lint/suspicious/noArrayIndexKey: line index is stable
          return (
            <div key={i} className="ml-3">
              · {renderInline(bulletMatch[1])}
            </div>
          );
        }
        // biome-ignore lint/suspicious/noArrayIndexKey: line index is stable
        if (!line.trim()) return <div key={i} className="h-2" />;
        // biome-ignore lint/suspicious/noArrayIndexKey: line index is stable
        return <div key={i}>{renderInline(line)}</div>;
      })}
    </>
  );
}

function HelpDeskLink({ searchQuery }: { searchQuery: string }): JSX.Element {
  const { t } = useLocale();
  const helpUrl = `https://cal.com/help/welcome?search=${encodeURIComponent(searchQuery)}`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Enter") {
        window.open(helpUrl, "_blank", "noopener,noreferrer");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [helpUrl]);

  return (
    <div className="px-4 py-6 text-center">
      <p className="mb-3 text-sm text-subtle">{t("kbar_no_results_found")}</p>
      <a
        href={helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-emphasis text-sm transition hover:text-default">
        <ExternalLinkIcon className="h-4 w-4" />
        {t("kbar_search_help_desk_prefix")} <span className="underline">&quot;{searchQuery}&quot;</span>{" "}
        {t("kbar_search_help_desk_suffix")}
      </a>
    </div>
  );
}

function CrowFallback({
  triggerQuery,
  searchQuery,
  onEnterChatMode,
}: {
  triggerQuery: string;
  searchQuery: string;
  onEnterChatMode: () => void;
}): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const { query } = useKBar();
  const [state, setState] = useState<CrowFallbackState>({
    mode: "search",
    messages: [],
    conversationId: null,
    streaming: false,
    checkingDocs: false,
    error: false,
  });
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasSentInitialRef = useRef(false);

  const sendMessage = useCallback(async (message: string, convId: string | null) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((s) => ({
      ...s,
      streaming: true,
      error: false,
      messages: [
        ...s.messages,
        { role: "user", text: message, href: null },
        { role: "assistant", text: "", href: null },
      ],
    }));

    try {
      const res = await fetch(`${CROW_API_URL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: CROW_PRODUCT_ID,
          message,
          conversation_id: convId,
          context: { page: window.location.pathname },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setState((s) => ({ ...s, streaming: false, error: s.mode === "search" }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let capturedConvId = convId;
      // Accumulate top-3 source URLs from MCP tool results across the stream
      const pendingSources: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            setState((s) => {
              const msgs = [...s.messages];
              const last = msgs[msgs.length - 1];
              if (last?.role === "assistant" && pendingSources.length > 0) {
                msgs[msgs.length - 1] = { ...last, sources: pendingSources };
              }
              return { ...s, mode: "chat", streaming: false, conversationId: capturedConvId, messages: msgs };
            });
            onEnterChatMode();
            return;
          }
          try {
            const event = JSON.parse(data) as CrowSSEEvent;
            if (event.type === "conversation_id" && event.conversation_id) {
              capturedConvId = event.conversation_id;
            } else if (event.type === "content" && event.content) {
              setState((s) => {
                const msgs = [...s.messages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant") {
                  msgs[msgs.length - 1] = { ...last, text: last.text + event.content! };
                }
                return { ...s, messages: msgs };
              });
            } else if (event.type === "client_tool_call" && event.tool_name === "navigateToPage") {
              // url is preferred (direct path); page is a named-route fallback the AI may pass instead
              const href = ((event.arguments?.url as string) || (event.arguments?.page as string)) ?? null;
              if (href) {
                setState((s) => {
                  const msgs = [...s.messages];
                  const last = msgs[msgs.length - 1];
                  if (last?.role === "assistant") {
                    msgs[msgs.length - 1] = { ...last, href };
                  }
                  return { ...s, messages: msgs };
                });
              }
            } else if (event.type === "tool_result" && pendingSources.length < 3) {
              // Extract up to 3 cal.com/help URLs from the MCP search result blob
              const blob = JSON.stringify(event);
              const urlPattern = /https:\/\/cal\.com\/help\/[^\s"')<>\\]+/g;
              let m: RegExpExecArray | null;
              // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
              while ((m = urlPattern.exec(blob)) !== null) {
                if (!pendingSources.includes(m[0])) pendingSources.push(m[0]);
                if (pendingSources.length >= 3) break;
              }
            } else if (event.type === "tool_call_start") {
              setState((s) => ({ ...s, checkingDocs: true }));
            } else if (event.type === "tool_call_complete") {
              setState((s) => ({ ...s, checkingDocs: false }));
            }
          } catch {
            // ignore malformed SSE frames
          }
        }
      }

      setState((s) => ({ ...s, mode: "chat", streaming: false, conversationId: capturedConvId }));
      onEnterChatMode();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setState((s) => ({ ...s, streaming: false, error: s.mode === "search" }));
      }
    }
  }, [onEnterChatMode]);

  // Fire once on mount with the trigger query (user explicitly selected "AI Answer").
  // The ref guard prevents React 18 Strict Mode's double-invoke from sending twice.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    if (hasSentInitialRef.current) return;
    hasSentInitialRef.current = true;
    if (!triggerQuery.trim() || !CROW_API_URL || !CROW_PRODUCT_ID) return;
    void sendMessage(triggerQuery, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps: fires once when user selects AI Answer

  // Enter key: send follow-up when in chat mode
  useEffect(() => {
    if (state.mode !== "chat") return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Enter" && searchQuery.trim() && !state.streaming) {
        e.preventDefault();
        e.stopPropagation();
        const msg = searchQuery.trim();
        query.setSearch("");
        sendMessage(msg, state.conversationId);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [state.mode, state.streaming, state.conversationId, searchQuery, query, sendMessage]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  if (!CROW_API_URL || !CROW_PRODUCT_ID) {
    return <HelpDeskLink searchQuery={searchQuery} />;
  }

  if (state.error) {
    return <HelpDeskLink searchQuery={searchQuery} />;
  }

  if (state.messages.length === 0) {
    return (
      <div className="flex items-center justify-center px-4 py-6">
        <span className="animate-pulse text-sm text-subtle">
          {state.checkingDocs ? t("kbar_crow_checking_docs") : t("kbar_crow_thinking")}
        </span>
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto px-4 py-3">
      {state.messages.map((msg, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: message list is append-only
        <div key={i} className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "user" ? (
            <div className="max-w-[75%] rounded-lg bg-subtle px-3 py-2 text-default text-sm">
              {msg.text}
            </div>
          ) : (
            <div className="max-w-[85%]">
              <p className="mb-1 font-medium text-subtle text-xs uppercase tracking-wide">
                {i === state.messages.length - 1 && state.checkingDocs && !msg.text
                  ? t("kbar_crow_checking_docs")
                  : t("kbar_crow_ai_label")}
              </p>
              <div className="text-default text-sm">
                {renderMarkdown(msg.text)}
                {i === state.messages.length - 1 && state.streaming && !state.checkingDocs && (
                  <span className="ml-0.5 animate-pulse">▋</span>
                )}
              </div>
              {msg.href && (
                <button
                  onClick={() => {
                    query.toggle();
                    router.push(msg.href!);
                  }}
                  className="mt-2 flex items-center gap-1.5 text-emphasis text-sm transition hover:underline">
                  <CornerDownLeftIcon className="h-3 w-3" />
                  {t("kbar_crow_navigate")}
                </button>
              )}
              {msg.sources && msg.sources.length > 0 && !state.streaming && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {msg.sources.slice(0, 5).map((url, si) => {
                    // Turn "/routing/routing-overview" into "Routing Overview"
                    const slug = url.split("/").pop() ?? "";
                    const label = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || t("kbar_crow_source");
                    return (
                      // biome-ignore lint/suspicious/noArrayIndexKey: source list is stable
                      <a
                        key={si}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-subtle text-xs transition hover:text-default">
                        <ExternalLinkIcon className="h-3 w-3" />
                        {label}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {state.mode === "chat" && !state.streaming && (
        <p className="pb-1 text-center text-subtle text-xs">{t("kbar_crow_follow_up_hint")}</p>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

function RenderResults(): JSX.Element {
  const { results } = useMatches();
  const { searchQuery } = useKBar((state) => ({ searchQuery: state.searchQuery }));
  const { query } = useKBar();
  const { t } = useLocale();
  const [inChatMode, setInChatMode] = useState(false);
  const [triggeredQuery, setTriggeredQuery] = useState<string | null>(null);
  // Updated synchronously during each render by KBarResults' onRender — never stale in handlers
  const aiAnswerActiveRef = useRef(false);

  useEventTypesAction();
  useUpcomingBookingsAction();

  const handleEnterChatMode = useCallback(() => {
    setInChatMode(true);
    query.setSearch("");
  }, [query]);

  const crowConfigured = !!(CROW_API_URL && CROW_PRODUCT_ID);
  const hasQuery = searchQuery.trim().length > 0;

  // Intercept Enter only when AI Answer is the active kbar item, keeping the palette open
  useEffect(() => {
    if (inChatMode || triggeredQuery !== null || !hasQuery || !crowConfigured) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Enter" && aiAnswerActiveRef.current) {
        e.stopImmediatePropagation();
        e.preventDefault();
        setTriggeredQuery(searchQuery);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [inChatMode, triggeredQuery, hasQuery, crowConfigured, searchQuery]);

  if (inChatMode || triggeredQuery !== null) {
    return (
      <CrowFallback
        triggerQuery={triggeredQuery ?? searchQuery}
        searchQuery={searchQuery}
        onEnterChatMode={handleEnterChatMode}
      />
    );
  }

  // Inject AI Answer as the last item in kbar's list so arrow navigation works natively
  const crowAiItem: Action = {
    id: "crow-ai-answer",
    name: "kbar_crow_ai_label",
    keywords: searchQuery,
    perform: () => {}, // never called — Enter is intercepted above, click is handled in onRender
  };
  const allItems = hasQuery && crowConfigured ? ([...results, crowAiItem] as (string | Action)[]) : results;

  return (
    <>
      {allItems.length > 0 && (
        <KBarResults
          items={allItems}
          onRender={({ item, active }: RenderItemProps): JSX.Element => {
            if (typeof item !== "string" && item.id === "crow-ai-answer") {
              // Track active state for the Enter capture handler above (updated during render — never stale)
              aiAnswerActiveRef.current = active;
              let background = "var(--cal-bg-default)";
              let borderLeft = "2px solid transparent";
              if (active) {
                background = "var(--cal-bg-subtle)";
                borderLeft = "2px solid var(--cal-border)";
              }
              return (
                <div
                  style={{ background, borderLeft, color: "var(--cal-text)" }}
                  className="flex items-center px-4 py-2.5 text-sm transition hover:cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation(); // prevent kbar from also firing perform()
                    setTriggeredQuery(searchQuery);
                  }}>
                  {t("kbar_crow_ai_label")}
                </div>
              );
            }
            return renderResultItem(item, active, t);
          }}
        />
      )}
      {hasQuery && !crowConfigured && results.length === 0 && (
        <HelpDeskLink searchQuery={searchQuery} />
      )}
    </>
  );
}

export { KBarRoot, KBarContent, KBarTrigger };
