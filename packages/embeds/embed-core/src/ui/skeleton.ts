import type { BookerLayouts, EmbedPageType } from "../types";

const generateEventMetaSkeleton = () => {
  return `
    <div 
        class="relative z-10 flex [grid-area:meta]" 
        style="position: sticky; top: 0px;">
        <div class="relative z-10 p-6" data-testid="event-meta">
          <div style="opacity: 1; transform: none;">
            <ul class="flex items-center border-muted">
              <li class="-mr-1 inline-block">
                <span class="bg-emphasis relative inline-flex aspect-square items-center justify-center border align-top w-6 h-6 min-w-6 min-h-6 rounded-full overflow-hidden border-subtle">
                  <div class="animate-pulse bg-emphasis w-full h-full"></div>
                </span>
              </li>
            </ul>
            <p class="text-subtle mt-2 text-sm font-semibold">
              <div class="animate-pulse bg-emphasis h-4 w-24 rounded-sm"></div>
            </p>
            <h1 data-testid="event-title" class="text-text text-xl font-semibold undefined my-2">
              <div class="animate-pulse bg-emphasis h-6 w-32 rounded-sm"></div>
            </h1>
            <div class="flex items-start justify-start text-sm text-text">
              <div class="relative z-10 mb-8 break-words max-w-full max-h-[180px] scroll-bar pr-4">
                <div class="animate-pulse bg-emphasis h-16 w-full rounded-sm"></div>
              </div>
            </div>
            <div class="space-y-4 font-medium rtl:-mr-2">
              <div class="flex items-start justify-start text-sm text-text">
                <div class="animate-pulse bg-emphasis h-4 w-4 mr-2 mt-[2px] rounded-sm"></div>
                <div class="animate-pulse bg-emphasis h-4 w-32 rounded-sm"></div>
              </div>
              <div class="flex justify-start text-sm text-text items-center">
                <div class="animate-pulse bg-emphasis h-4 w-4 mr-2 mt-[2px] rounded-sm"></div>
                <div class="animate-pulse bg-emphasis h-4 w-16 rounded-sm"></div>
              </div>
              <div class="flex items-start justify-start text-sm text-text">
                <div class="animate-pulse bg-emphasis h-4 w-4 mr-2 mt-[2px] rounded-sm"></div>
                <div class="animate-pulse bg-emphasis h-4 w-24 rounded-sm"></div>
              </div>
              <div class="flex items-start justify-start text-sm text-text">
                <div class="animate-pulse bg-emphasis h-4 w-4 mr-2 mt-[2px] rounded-sm"></div>
                <div class="animate-pulse bg-emphasis h-4 w-32 rounded-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
  `;
};

const generateBookerMainSkeleton = () => {
  const dayLabels = Array(7)
    .fill(0)
    .map(
      () => `
      <div class="text-emphasis my-4 text-xs font-medium uppercase tracking-widest">
        <div class="animate-pulse bg-emphasis h-4 w-12 rounded-sm"></div>
      </div>
    `
    )
    .join("");

  const dates = Array.from({ length: 35 })
    .map(
      () => `
  <div class="relative w-full pt-[100%]">
    <button class="bg-muted text-muted absolute bottom-0 left-0 right-0 top-0 mx-auto flex w-full items-center justify-center rounded-sm border-transparent text-center font-medium opacity-90 transition" disabled="">
      <span class="font-size-0 bg-emphasis inline-block animate-pulse rounded-md empty:before:inline-block empty:before:content-[''] h-8 w-9"></span>
    </button>
  </div>`
    )
    .join("");

  return ` <div class="[grid-area:main] md:border-subtle ml-[-1px] h-full flex-shrink px-5 py-3 md:border-l lg:w-[var(--booker-main-width)]" style="opacity: 1; transform: none;">
          <div>
            <div class="mb-1 flex items-center justify-between text-xl">
              <span class="text-default w-1/2 text-base">
                <time datetime="2025-05" data-testid="selected-month-label">
                  <span class="text-emphasis font-semibold">
                    <div class="animate-pulse bg-emphasis h-4 w-20 rounded-sm"></div>
                  </span> 
                </time>
              </span>
              <div class="text-emphasis">
                <div class="flex">
                  <button class="group whitespace-nowrap items-center font-medium relative rounded-[10px] disabled:cursor-not-allowed gap-1 flex justify-center text-subtle border border-transparent enabled:hover:bg-subtle enabled:hover:text-emphasis enabled:hover:border-subtle hover:border disabled:opacity-30 focus-visible:bg-subtle focus-visible:outline-none focus-visible:ring-0 focus-visible:border-subtle focus-visible:shadow-button-outline-gray-focused enabled:active:shadow-outline-gray-active duration-200 text-sm leading-none min-h-[36px] min-w-[36px] !p-2 hover:border-default group p-1 opacity-70 transition hover:opacity-100 rtl:rotate-180" data-testid="decrementMonth" aria-label="View previous month" type="button">
                    <svg height="16" width="16" class="fill-transparent visible button-icon group-active:translate-y-[0.5px] h-4 w-4" data-name="start-icon" aria-hidden="true">
                      <use href="#chevron-left"></use>
                    </svg>
                    <div class="contents visible group-active:translate-y-[0.5px]"></div>
                  </button>
                  <button class="group whitespace-nowrap items-center font-medium relative rounded-[10px] disabled:cursor-not-allowed gap-1 flex justify-center text-subtle border border-transparent enabled:hover:bg-subtle enabled:hover:text-emphasis enabled:hover:border-subtle hover:border disabled:opacity-30 focus-visible:bg-subtle focus-visible:outline-none focus-visible:ring-0 focus-visible:border-subtle focus-visible:shadow-button-outline-gray-focused enabled:active:shadow-outline-gray-active duration-200 text-sm leading-none min-h-[36px] min-w-[36px] !p-2 hover:border-default group p-1 opacity-70 transition hover:opacity-100 rtl:rotate-180 undefined" data-testid="incrementMonth" aria-label="View next month" type="button">
                    <svg height="16" width="16" class="fill-transparent visible button-icon group-active:translate-y-[0.5px] h-4 w-4" data-name="start-icon" aria-hidden="true">
                      <use href="#chevron-right"></use>
                    </svg>
                    <div class="contents visible group-active:translate-y-[0.5px]"></div>
                  </button>
                </div>
              </div>
            </div>
            <div class="border-subtle mb-2 grid grid-cols-7 gap-4 border-b border-t text-center md:mb-0 md:border-0">
              ${dayLabels}
            </div>
            <div class="relative grid grid-cols-7 grid-rows-6 gap-1 text-center">
             ${dates}
            </div>
          </div>
        </div>`;
};

const generateBookingSlotsPageSkeleton = ({ layout: _layout }: { layout: BookerLayouts | null }) => {
  // TODO: Support different layouts. Right now we show month view skeleton for all layouts
  return `
  <div 
    data-testid="booker-container" 
    class="[--booker-timeslots-width:240px] lg:[--booker-timeslots-width:280px] [--booker-meta-width:240px] [--booker-main-width:480px] lg:[--booker-meta-width:280px] bg-default dark:bg-muted grid max-w-full items-start dark:[color-scheme:dark] sm:motion-reduce:transition-none md:flex-row rounded-md sm:transition-[width] sm:duration-300 border-subtle border undefined" 
    style="grid-template-areas: &quot;meta main main&quot; &quot;meta main main&quot;; width: calc(var(--booker-meta-width) + var(--booker-main-width)); grid-template-columns: var(--booker-meta-width) var(--booker-main-width); grid-template-rows: 1fr 0fr; min-height: 450px; height: auto;">
    ${generateEventMetaSkeleton()}
    ${generateBookerMainSkeleton()}
  </div>
`;
};

const generateSkeleton = ({
  layout = "month_view",
  pageType,
}: {
  layout?: BookerLayouts;
  pageType: EmbedPageType | null;
}) => {
  if (!pageType) {
    // Ideally we shouldn't be here if pageType is nullish, but just in case
    return generateBookingSlotsPageSkeleton({ layout });
  }

  if (pageType === "user.event.booking.slots" || pageType === "team.event.booking.slots") {
    return generateBookingSlotsPageSkeleton({ layout });
  }

  // TODO: Support skeletons for other pages like user.event.booking.form, team.event.booking.form and profile pages
  return generateBookingSlotsPageSkeleton({ layout });
};

export { generateSkeleton };
