import type { LayoutOption, PageKind } from "../types/shared";

function pulse(height: string, width: string, extra = ""): string {
  return `<div class="animate-pulse bg-emphasis ${height} ${width}${extra ? ` ${extra}` : ""}"></div>`;
}

function eventMeta(): string {
  return `
    <div class="relative z-10 p-6" data-testid="event-meta">
      <div style="opacity: 1; transform: none;">
        <ul class="flex items-center border-muted">
          <li class="-mr-1 inline-block">
            <span class="bg-emphasis relative inline-flex aspect-square items-center justify-center border align-top w-6 h-6 min-w-6 min-h-6 rounded-full overflow-hidden border-subtle">
              ${pulse("w-full", "h-full")}
            </span>
          </li>
        </ul>
        <p class="text-subtle mt-2 text-sm font-semibold">
          ${pulse("h-4", "w-24", "rounded-sm")}
        </p>
        <h1 data-testid="event-title" class="text-text text-xl font-semibold my-2 mb-4">
          ${pulse("h-6", "w-20", "rounded-sm")}
        </h1>
        <div class="space-y-3 font-medium">
          <div class="flex items-start justify-start text-sm text-text">
            ${pulse("h-4", "w-4", "mr-2 rounded-full")}
            ${pulse("h-4", "w-10", "rounded-sm")}
          </div>
          <div class="flex items-start justify-start text-sm text-text">
            ${pulse("h-4", "w-4", "mr-2 rounded-full")}
            ${pulse("h-4", "w-20", "rounded-sm mr-1")}
            ${pulse("h-4", "w-4", "rounded-sm")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function weekHeaders(): string {
  return Array(7)
    .fill(null)
    .map(
      () => `
    <div class="text-emphasis my-4 text-xs font-medium uppercase tracking-widest">
      ${pulse("h-4", "w-8", "rounded-sm")}
    </div>
  `
    )
    .join("");
}

function dayCells(leading: number, count: number, trailing: number): string {
  const blank = () => `<div class="relative w-full pt-[100%]"></div>`;
  const day = () => `
    <div class="relative w-full pt-[100%]">
      <button
        class="bg-muted text-muted absolute bottom-0 left-0 right-0 top-0 mx-auto flex w-full items-center justify-center rounded-sm border-transparent text-center font-medium opacity-90 transition"
        disabled=""
      >
        <span class="font-size-0 bg-emphasis inline-block animate-pulse rounded-md empty:before:inline-block empty:before:content-[''] h-9 w-9"></span>
      </button>
    </div>
  `;

  return [
    ...Array(leading).fill(null).map(blank),
    ...Array(count).fill(null).map(day),
    ...Array(trailing).fill(null).map(blank),
  ].join("");
}

function calendarGrid(): string {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysCount = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const leading = monthStart.getDay();
  const trailing = 42 - leading - daysCount;
  const ym = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

  const navClass = [
    "group whitespace-nowrap items-center font-medium relative rounded-[10px]",
    "disabled:cursor-not-allowed gap-1 flex justify-center text-subtle border border-transparent",
    "enabled:hover:bg-subtle enabled:hover:text-emphasis enabled:hover:border-subtle hover:border",
    "disabled:opacity-30 focus-visible:bg-subtle focus-visible:outline-none focus-visible:ring-0",
    "focus-visible:border-subtle focus-visible:shadow-button-outline-gray-focused",
    "enabled:active:shadow-outline-gray-active duration-200 text-sm leading-none",
    "min-h-[36px] min-w-[36px] !p-2 hover:border-default group p-1 opacity-70 transition hover:opacity-100 rtl:rotate-180",
  ].join(" ");

  const navBtn = (testId: string, label: string, icon: string, disabled: string) => `
    <button class="${navClass}" data-testid="${testId}" aria-label="${label}" type="button" ${disabled}>
      <svg height="16" width="16" class="fill-transparent visible button-icon group-active:translate-y-[0.5px] h-4 w-4" data-name="start-icon" aria-hidden="true">
        <use href="${icon}"></use>
      </svg>
      <div class="contents visible group-active:translate-y-[0.5px]"></div>
    </button>
  `;

  return `
    <div>
      <div class="mb-1 flex items-center justify-between text-xl">
        <span class="text-default w-1/2 text-base">
          <time datetime="${ym}" data-testid="selected-month-label">
            <span class="text-emphasis font-semibold">
              ${pulse("h-4", "w-20", "rounded-sm")}
            </span>
          </time>
        </span>
        <div class="text-emphasis">
          <div class="flex">
            ${navBtn("decrementMonth", "View previous month", "#chevron-left", "disabled")}
            ${navBtn("incrementMonth", "View next month", "#chevron-right", "")}
          </div>
        </div>
      </div>
      <div class="border-subtle mb-2 grid grid-cols-7 gap-4 border-b border-t text-center md:mb-0 md:border-0">
        ${weekHeaders()}
      </div>
      <div class="relative grid grid-cols-7 grid-rows-6 gap-1 text-center">
        ${dayCells(leading, daysCount, trailing)}
      </div>
    </div>
  `;
}

const BASE_BOOKER = [
  "[--booker-timeslots-width:240px] lg:[--booker-timeslots-width:280px]",
  "bg-default dark:bg-muted grid max-w-full items-start dark:[color-scheme:dark]",
  "sm:motion-reduce:transition-none md:flex-row rounded-md",
].join(" ");

function mobileLayout(): string {
  return `
    <div
      data-testid="booker-container"
      class="${BASE_BOOKER} [--booker-main-width:480px] [--booker-meta-width:340px] lg:[--booker-meta-width:424px] border-subtle sm:transition-[width] sm:duration-300"
      style="grid-template-areas: &quot;meta&quot; &quot;header&quot; &quot;main&quot; &quot;timeslots&quot;; width: 100%; grid-template-columns: 100%; grid-template-rows: minmax(min-content, max-content) 1fr; min-height: 0px; height: auto;"
    >
      <div class="relative z-10 flex [grid-area:meta]">
        <div class="[grid-area:meta] max-w-screen flex w-full flex-col md:w-[var(--booker-meta-width)]">
          ${eventMeta()}
          <div class="mt-auto px-5 py-3">${calendarGrid()}</div>
        </div>
      </div>
      <div
        class="[grid-area:main] md:border-subtle ml-[-1px] h-full flex-shrink px-5 py-3 md:border-l lg:w-[var(--booker-main-width)]"
        style="opacity: 1; transform: none;"
      ></div>
    </div>
  `;
}

function desktopLayout(): string {
  return `
    <div
      data-testid="booker-container"
      class="${BASE_BOOKER} [--booker-meta-width:240px] [--booker-main-width:480px] lg:[--booker-meta-width:280px] border-subtle border sm:transition-[width] sm:duration-300"
      style="grid-template-areas: &quot;meta main main&quot; &quot;meta main main&quot;; width: calc(var(--booker-meta-width) + var(--booker-main-width)); grid-template-columns: var(--booker-meta-width) var(--booker-main-width); grid-template-rows: 1fr 0fr; min-height: 450px; height: auto;"
    >
      <div class="relative z-10 flex [grid-area:meta]" style="position: sticky; top: 0px;">
        ${eventMeta()}
      </div>
      <div
        class="[grid-area:main] md:border-subtle ml-[-1px] h-full flex-shrink px-5 py-3 md:border-l lg:w-[var(--booker-main-width)]"
        style="opacity: 1; transform: none;"
      >
        ${calendarGrid()}
      </div>
    </div>
  `;
}

const SLOT_PAGE_KINDS: PageKind[] = ["user.event.booking.slots", "team.event.booking.slots"];

export function renderSkeleton({
  layout = "month_view",
  pageKind: _pageKind,
}: {
  layout: LayoutOption | null;
  pageKind: PageKind | null;
}): string {
  const content = layout === "mobile" ? mobileLayout() : desktopLayout();
  return content;
}
