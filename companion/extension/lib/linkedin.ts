/// <reference types="chrome" />
import { escapeHtml } from "./utils";

// LinkedIn integration: inject a Cal.com scheduling button in LinkedIn messaging

// ============================================================================
// Constants
// ============================================================================

const CONSTANTS = {
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  BUTTON_SIZES: {
    SMALL: { button: 24, icon: 14 },
    LARGE: { button: 32, icon: 18 },
  },
  MENU: {
    WIDTH: 400,
    MAX_HEIGHT: 350,
    MARGIN: 20,
    GAP: 8,
  },
  ANIMATION: {
    TOOLTIP_FADE_DELAY: 150,
    NOTIFICATION_DURATION: 3000,
    NOTIFICATION_FADE_OUT: 200,
  },
  COLORS: {
    BUTTON_BG: "#000000",
    BUTTON_HOVER: "#333333",
    TOOLTIP_BG: "#1a1a1a",
    NOTIFICATION_SUCCESS: "#111827",
    NOTIFICATION_ERROR: "#752522",
    HOVER_BG: "#f8f9fa",
  },
  SELECTORS: {
    LEFT_ACTIONS: ".msg-form__left-actions",
    EMOJI_BUTTON: "div:has(> span.artdeco-hoverable-trigger button.emoji-hoverable-trigger)",
    EMOJI_BUTTON_FALLBACK: 'div:has(button[aria-label="Open Emoji Keyboard"])',
    LARGE_BUTTON: ".artdeco-button--2",
    CAL_BUTTON: ".cal-companion-linkedin-button",
    CAL_MENU: ".cal-companion-linkedin-menu",
    MESSAGE_INPUT: [
      'div[contenteditable="true"][role="textbox"][aria-label*="message" i]',
      'div[contenteditable="true"][data-testid*="message"]',
      'div[contenteditable="true"].msg-form__contenteditable',
    ],
  },
  CLASSES: {
    BASE_BUTTON:
      "cal-companion-linkedin-button msg-form__footer-action artdeco-button artdeco-button--tertiary artdeco-button--circle artdeco-button--muted",
    SMALL_BUTTON: "artdeco-button--1",
    LARGE_BUTTON: "artdeco-button--2",
    WRAPPER: "cal-companion-linkedin-wrapper inline-block",
    MENU: "cal-companion-linkedin-menu",
    TOOLTIP: "cal-tooltip",
  },
} as const;

// SVG Icons
const SVG_ICONS = {
  CAL_LOGO: (size: number) => `
    <svg role="none" aria-hidden="true" class="artdeco-button__icon" width="${size}" height="${size}" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.4688 5H17.0887V13.76H15.4688V5Z" fill="white"/>
      <path d="M10.918 13.9186C10.358 13.9186 9.84198 13.7746 9.36998 13.4866C8.89798 13.1906 8.52198 12.7946 8.24198 12.2986C7.96998 11.8026 7.83398 11.2586 7.83398 10.6666C7.83398 10.0746 7.96998 9.53063 8.24198 9.03463C8.52198 8.53063 8.89798 8.13062 9.36998 7.83462C9.84198 7.53862 10.358 7.39062 10.918 7.39062C11.43 7.39062 11.842 7.48662 12.154 7.67862C12.474 7.87062 12.722 8.14662 12.898 8.50662V7.52262H14.506V13.7626H12.934V12.7426C12.75 13.1186 12.498 13.4106 12.178 13.6186C11.866 13.8186 11.446 13.9186 10.918 13.9186ZM9.45398 10.6546C9.45398 10.9746 9.52598 11.2746 9.66998 11.5546C9.82198 11.8266 10.026 12.0466 10.282 12.2146C10.546 12.3746 10.846 12.4546 11.182 12.4546C11.526 12.4546 11.83 12.3746 12.094 12.2146C12.366 12.0546 12.574 11.8386 12.718 11.5666C12.862 11.2946 12.934 10.9946 12.934 10.6666C12.934 10.3386 12.862 10.0386 12.718 9.76662C12.574 9.48662 12.366 9.26662 12.094 9.10663C11.83 8.93863 11.526 8.85463 11.182 8.85463C10.846 8.85463 10.546 8.93863 10.282 9.10663C10.018 9.26662 9.81398 9.48262 9.66998 9.75462C9.52598 10.0266 9.45398 10.3266 9.45398 10.6546Z" fill="white"/>
      <path d="M4.68078 13.919C3.86478 13.919 3.12078 13.727 2.44878 13.343C1.78478 12.951 1.26078 12.423 0.876781 11.759C0.492781 11.095 0.300781 10.367 0.300781 9.57503C0.300781 8.77503 0.484781 8.04303 0.852781 7.37903C1.22878 6.70703 1.74878 6.17903 2.41278 5.79503C3.07678 5.40303 3.83278 5.20703 4.68078 5.20703C5.36078 5.20703 5.94478 5.31503 6.43278 5.53103C6.92878 5.73903 7.36878 6.07103 7.75278 6.52703L6.56478 7.55903C6.06078 7.03103 5.43278 6.76703 4.68078 6.76703C4.15278 6.76703 3.68878 6.89503 3.28878 7.15103C2.88878 7.39903 2.58078 7.73903 2.36478 8.17103C2.14878 8.59503 2.04078 9.06303 2.04078 9.57503C2.04078 10.087 2.14878 10.555 2.36478 10.979C2.58878 11.403 2.90078 11.739 3.30078 11.987C3.70878 12.235 4.18078 12.359 4.71678 12.359C5.50078 12.359 6.14078 12.087 6.63678 11.543L7.86078 12.587C7.52478 12.995 7.08478 13.319 6.54078 13.559C6.00478 13.799 5.38478 13.919 4.68078 13.919Z" fill="white"/>
    </svg>
  `,
  PREVIEW: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C3F44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  `,
  COPY: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C3F44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  `,
  COPY_SUCCESS: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `,
  EDIT: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3C3F44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `,
  ERROR: `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  `,
  CHECK: `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.3332 4L5.99984 11.3333L2.6665 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
} as const;

// ============================================================================
// Types
// ============================================================================

interface EventType {
  id: string;
  title?: string;
  slug: string;
  lengthInMinutes?: number;
  length?: number;
  duration?: number;
  description?: string;
  users?: Array<{ username?: string }>;
  bookingUrl?: string;
}

interface ButtonSize {
  button: number;
  icon: number;
}

// ============================================================================
// Main Integration Function
// ============================================================================

export function initLinkedInIntegration() {
  // Cache for event types (refreshed on page reload)
  let eventTypesCache: EventType[] | null = null;
  let cacheTimestamp: number | null = null;

  console.log("[Cal.com] LinkedIn integration starting...");

  injectStyles();

  // ============================================================================
  // Button Injection
  // ============================================================================

  function injectCalButton() {
    const leftActionsContainers = document.querySelectorAll<HTMLElement>(
      CONSTANTS.SELECTORS.LEFT_ACTIONS
    );

    console.log("[Cal.com] Found left-actions containers:", leftActionsContainers.length);

    leftActionsContainers.forEach((leftActions) => {
      if (leftActions.querySelector(CONSTANTS.SELECTORS.CAL_BUTTON)) {
        return;
      }

      const emojiButtonContainer = findEmojiButtonContainer(leftActions);
      const isLargeContext = detectButtonSizeContext(leftActions);
      const sizes = isLargeContext ? CONSTANTS.BUTTON_SIZES.LARGE : CONSTANTS.BUTTON_SIZES.SMALL;

      console.log(
        "[Cal.com] Injecting Cal.com button into LinkedIn messaging",
        isLargeContext ? "(large context)" : "(small context)"
      );

      const calWrapper = createButtonWrapper();
      const calButton = createCalButton(isLargeContext, sizes);
      calWrapper.appendChild(calButton);

      insertButtonIntoDOM(leftActions, calWrapper, emojiButtonContainer);

      console.log("[Cal.com] Successfully injected Cal.com button");
    });
  }

  function findEmojiButtonContainer(container: HTMLElement): Element | null {
    return (
      container.querySelector(CONSTANTS.SELECTORS.EMOJI_BUTTON) ||
      container.querySelector(CONSTANTS.SELECTORS.EMOJI_BUTTON_FALLBACK)
    );
  }

  function detectButtonSizeContext(container: HTMLElement): boolean {
    return !!container.querySelector(CONSTANTS.SELECTORS.LARGE_BUTTON);
  }

  function createButtonWrapper(): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.className = CONSTANTS.CLASSES.WRAPPER;
    wrapper.style.cssText =
      "display: flex; align-items: center; align-self: center; margin-left: 8px;";
    return wrapper;
  }

  function createCalButton(isLargeContext: boolean, sizes: ButtonSize): HTMLButtonElement {
    const button = document.createElement("button");
    const buttonClass = `${CONSTANTS.CLASSES.BASE_BUTTON} ${
      isLargeContext ? CONSTANTS.CLASSES.LARGE_BUTTON : CONSTANTS.CLASSES.SMALL_BUTTON
    }`;
    button.className = buttonClass;
    button.type = "button";
    button.title = "Schedule with Cal.com";
    button.setAttribute("aria-label", "Schedule with Cal.com");

    button.style.cssText = `
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: ${sizes.button}px !important;
      height: ${sizes.button}px !important;
      min-width: ${sizes.button}px !important;
      min-height: ${sizes.button}px !important;
      border-radius: 50% !important;
      background-color: ${CONSTANTS.COLORS.BUTTON_BG} !important;
      border: none !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
      padding: 0 !important;
      margin: 0 !important;
    `;

    button.innerHTML = SVG_ICONS.CAL_LOGO(sizes.icon);

    // Add hover effects
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = CONSTANTS.COLORS.BUTTON_HOVER;
      button.style.transform = "scale(1.05)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = CONSTANTS.COLORS.BUTTON_BG;
      button.style.transform = "scale(1)";
    });

    // Add click handler
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const existingMenu = document.querySelector<HTMLElement>(CONSTANTS.SELECTORS.CAL_MENU);
      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      createEventTypesMenu(button);
    });

    return button;
  }

  function insertButtonIntoDOM(
    leftActions: HTMLElement,
    calWrapper: HTMLDivElement,
    emojiButtonContainer: Element | null
  ) {
    if (emojiButtonContainer?.nextSibling) {
      const nextElement = emojiButtonContainer.nextSibling;
      if (
        nextElement instanceof Element &&
        (nextElement.classList.contains("calendly-button") || nextElement.tagName === "TD")
      ) {
        leftActions.insertBefore(calWrapper, nextElement);
      } else {
        leftActions.insertBefore(calWrapper, nextElement);
      }
    } else if (emojiButtonContainer) {
      if (emojiButtonContainer.nextSibling) {
        leftActions.insertBefore(calWrapper, emojiButtonContainer.nextSibling);
      } else {
        leftActions.appendChild(calWrapper);
      }
    } else {
      leftActions.appendChild(calWrapper);
    }
  }

  // ============================================================================
  // Menu Creation
  // ============================================================================

  function createEventTypesMenu(button: HTMLButtonElement) {
    const menu = document.createElement("div");
    menu.className = CONSTANTS.CLASSES.MENU;
    positionMenu(menu, button);
    menu.innerHTML = `
      <div style="padding: 16px; text-align: center; color: #5f6368;">
        Loading event types...
      </div>
    `;

    const tooltipsToCleanup: HTMLElement[] = [];
    fetchEventTypes(menu, tooltipsToCleanup);

    // Prevent event bubbling
    menu.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    menu.addEventListener("scroll", (e) => e.stopPropagation(), { passive: true });

    document.body.appendChild(menu);

    // Close menu when clicking outside
    setTimeout(() => {
      const closeMenu = (evt: MouseEvent) => {
        if (!menu.contains(evt.target as Node) && evt.target !== button) {
          for (const tooltip of tooltipsToCleanup) {
            tooltip.remove();
          }
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      document.addEventListener("click", closeMenu);
    }, 0);
  }

  function positionMenu(menu: HTMLDivElement, button: HTMLButtonElement) {
    const buttonRect = button.getBoundingClientRect();
    const { WIDTH, MAX_HEIGHT, MARGIN, GAP } = CONSTANTS.MENU;

    let menuLeft = buttonRect.left;
    const menuBottom = window.innerHeight - buttonRect.top + GAP;

    // Keep menu within screen bounds
    if (menuLeft + WIDTH > window.innerWidth - MARGIN) {
      menuLeft = window.innerWidth - WIDTH - MARGIN;
    }
    if (menuLeft < MARGIN) {
      menuLeft = MARGIN;
    }

    // Determine vertical position
    const spaceAbove = buttonRect.top;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const positionStyle =
      spaceAbove < MAX_HEIGHT && spaceBelow > spaceAbove
        ? `top: ${buttonRect.bottom + GAP}px;`
        : `bottom: ${menuBottom}px;`;

    menu.style.cssText = `
      position: fixed;
      ${positionStyle}
      left: ${menuLeft}px;
      width: ${WIDTH}px;
      max-height: ${Math.min(MAX_HEIGHT, Math.max(spaceAbove, spaceBelow) - MARGIN)}px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: #c1c1c1 transparent;
    `;
  }

  // ============================================================================
  // Event Types Fetching & Display
  // ============================================================================

  async function fetchEventTypes(menu: HTMLElement, tooltipsToCleanup: HTMLElement[]) {
    try {
      const eventTypes = await getEventTypes();
      renderEventTypes(menu, eventTypes, tooltipsToCleanup);
    } catch (error) {
      handleFetchError(error, menu, tooltipsToCleanup);
    }
  }

  async function getEventTypes(): Promise<EventType[]> {
    const now = Date.now();
    const isCacheValid =
      eventTypesCache && cacheTimestamp && now - cacheTimestamp < CONSTANTS.CACHE_DURATION;

    if (isCacheValid && eventTypesCache) {
      return eventTypesCache;
    }

    if (!chrome.runtime?.id) {
      throw new Error("Extension context invalidated. Please reload the page.");
    }

    const response = await new Promise<unknown>((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: "fetch-event-types" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && (response as { error?: string }).error) {
            reject(new Error((response as { error: string }).error));
          } else {
            resolve(response);
          }
        });
      } catch (err) {
        reject(err);
      }
    });

    let eventTypes: EventType[] = [];
    if (response && typeof response === "object" && "data" in response) {
      eventTypes = Array.isArray((response as { data: unknown }).data)
        ? ((response as { data: unknown }).data as EventType[])
        : [];
    } else if (Array.isArray(response)) {
      eventTypes = response;
    }

    eventTypesCache = eventTypes;
    cacheTimestamp = now;
    return eventTypes;
  }

  function renderEventTypes(
    menu: HTMLElement,
    eventTypes: EventType[],
    tooltipsToCleanup: HTMLElement[]
  ) {
    menu.innerHTML = "";

    if (eventTypes.length === 0) {
      menu.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #5f6368;">
          No event types found
        </div>
      `;
      return;
    }

    try {
      eventTypes.forEach((eventType, index) => {
        if (!eventType || typeof eventType !== "object") {
          return;
        }

        const menuItem = createEventTypeMenuItem(
          eventType,
          index,
          eventTypes.length,
          tooltipsToCleanup
        );
        menu.appendChild(menuItem);
      });
    } catch (_error) {
      menu.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #ea4335;">
          Error displaying event types
        </div>
      `;
    }
  }

  function createEventTypeMenuItem(
    eventType: EventType,
    index: number,
    totalItems: number,
    tooltipsToCleanup: HTMLElement[]
  ): HTMLElement {
    const title = eventType.title || "Untitled Event";
    const length = eventType.lengthInMinutes || eventType.length || eventType.duration || 30;
    const description = eventType.description || "";

    const menuItem = document.createElement("div");
    menuItem.style.cssText = `
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background-color 0.1s ease;
      border-bottom: ${index < totalItems - 1 ? "1px solid #E5E5EA" : "none"};
    `;

    const contentWrapper = createEventTypeContent(
      eventType,
      title,
      length,
      description,
      tooltipsToCleanup
    );
    const buttonsContainer = createEventTypeButtons(eventType, tooltipsToCleanup);

    menuItem.appendChild(contentWrapper);
    menuItem.appendChild(buttonsContainer);

    // Hover effect
    menuItem.addEventListener("mouseenter", () => {
      menuItem.style.backgroundColor = CONSTANTS.COLORS.HOVER_BG;
    });
    menuItem.addEventListener("mouseleave", () => {
      menuItem.style.backgroundColor = "transparent";
    });

    return menuItem;
  }

  function createEventTypeContent(
    eventType: EventType,
    title: string,
    length: number,
    description: string,
    tooltipsToCleanup: HTMLElement[]
  ): HTMLElement {
    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      margin-right: 12px;
      position: relative;
      min-width: 0;
      overflow: hidden;
    `;

    contentWrapper.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 6px; overflow: hidden;">
        <span style="color: #3c4043; font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${escapeHtml(title)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
        <span style="
          display: inline-flex;
          align-items: center;
          background-color: #E5E5EA;
          border: 1px solid #E5E5EA;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 12px;
          color: #000;
          font-weight: 600;
          flex-shrink: 0;
        ">
          ${length}min
        </span>
        ${
          description
            ? `<span style="color: #5f6368; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;">${escapeHtml(description)}</span>`
            : ""
        }
      </div>
    `;

    const tooltip = createTooltip("Insert link", contentWrapper);
    tooltipsToCleanup.push(tooltip);

    contentWrapper.addEventListener("mouseenter", () => {
      const rect = contentWrapper.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2 + 80}px`;
      tooltip.style.top = `${rect.top + 35}px`;
      tooltip.style.transform = "translate(-50%, -100%)";
      tooltip.style.display = "block";
      tooltip.style.opacity = "1";
    });

    contentWrapper.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
      setTimeout(() => {
        if (tooltip.style.opacity === "0") {
          tooltip.style.display = "none";
        }
      }, CONSTANTS.ANIMATION.TOOLTIP_FADE_DELAY);
    });

    contentWrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      tooltip.remove();
      const menu = document.querySelector<HTMLElement>(CONSTANTS.SELECTORS.CAL_MENU);
      if (menu) menu.remove();
      insertEventTypeLink(eventType);
    });

    return contentWrapper;
  }

  function createEventTypeButtons(
    eventType: EventType,
    tooltipsToCleanup: HTMLElement[]
  ): HTMLElement {
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0;
      flex-shrink: 0;
    `;

    const previewBtn = createActionButton(
      SVG_ICONS.PREVIEW,
      "Preview",
      "6px 0 0 6px",
      tooltipsToCleanup
    );
    previewBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const bookingUrl = buildBookingUrl(eventType);
      window.open(bookingUrl, "_blank");
    });

    const copyBtn = createActionButton(SVG_ICONS.COPY, "Copy link", "none", tooltipsToCleanup);
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const bookingUrl = buildBookingUrl(eventType);
      navigator.clipboard
        .writeText(bookingUrl)
        .then(() => {
          showNotification("Link copied!", "success");
          copyBtn.innerHTML = SVG_ICONS.COPY_SUCCESS;
          setTimeout(() => {
            copyBtn.innerHTML = SVG_ICONS.COPY;
          }, 2000);
        })
        .catch(() => {
          showNotification("Failed to copy link", "error");
        });
    });

    const editBtn = createActionButton(SVG_ICONS.EDIT, "Edit", "0 6px 6px 0", tooltipsToCleanup);
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const editUrl = `https://app.cal.com/event-types/${eventType.id}`;
      window.open(editUrl, "_blank");
    });

    buttonsContainer.appendChild(previewBtn);
    buttonsContainer.appendChild(copyBtn);
    buttonsContainer.appendChild(editBtn);

    return buttonsContainer;
  }

  function createActionButton(
    icon: string,
    tooltipText: string,
    borderRadius: string,
    tooltipsToCleanup: HTMLElement[]
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.innerHTML = icon;
    button.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e5e5ea;
      border-radius: ${borderRadius};
      ${borderRadius === "none" ? "border-right: none;" : ""}
      background: white;
      cursor: pointer;
      transition: background-color 0.1s ease;
      padding: 0;
      position: relative;
    `;

    const tooltip = createTooltip(tooltipText, button);
    tooltipsToCleanup.push(tooltip);

    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = CONSTANTS.COLORS.HOVER_BG;
    });
    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "white";
    });

    return button;
  }

  function buildBookingUrl(eventType: EventType): string {
    return (
      eventType.bookingUrl ||
      `https://cal.com/${eventType.users?.[0]?.username || "user"}/${eventType.slug}`
    );
  }

  function handleFetchError(error: unknown, menu: HTMLElement, tooltipsToCleanup: HTMLElement[]) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthError =
      errorMessage.includes("OAuth") ||
      errorMessage.includes("access token") ||
      errorMessage.includes("sign in") ||
      errorMessage.includes("authentication");

    if (isAuthError) {
      for (const tooltip of tooltipsToCleanup) {
        tooltip.remove();
      }
      menu.remove();
      openCalSidebar();
      return;
    }

    menu.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <div style="margin-bottom: 12px;">
          ${SVG_ICONS.ERROR}
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px;">
          Something went wrong
        </div>
        <div style="font-size: 13px; color: #6B7280; margin-bottom: 16px;">
          ${escapeHtml(errorMessage || "Failed to load event types")}
        </div>
        <button class="cal-linkedin-close-btn" style="
          background: #F3F4F6;
          color: #374151;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        ">Close</button>
      </div>
    `;

    const closeBtn = menu.querySelector<HTMLButtonElement>(".cal-linkedin-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("mouseenter", () => {
        closeBtn.style.background = "#E5E7EB";
      });
      closeBtn.addEventListener("mouseleave", () => {
        closeBtn.style.background = "#F3F4F6";
      });
      closeBtn.addEventListener("click", () => {
        for (const tooltip of tooltipsToCleanup) {
          tooltip.remove();
        }
        menu.remove();
      });
    }
  }

  // ============================================================================
  // Tooltip Helper
  // ============================================================================

  function createTooltip(text: string, element: HTMLElement): HTMLElement {
    const tooltip = document.createElement("div");
    tooltip.className = CONSTANTS.CLASSES.TOOLTIP;
    tooltip.style.cssText = `
      position: fixed;
      background-color: ${CONSTANTS.COLORS.TOOLTIP_BG};
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity ${CONSTANTS.ANIMATION.TOOLTIP_FADE_DELAY}ms ease;
      z-index: 10002;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      display: none;
    `;
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    const updatePosition = () => {
      const rect = element.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top - 8}px`;
      tooltip.style.transform = "translate(-50%, -100%)";
    };

    element.addEventListener("mouseenter", () => {
      updatePosition();
      tooltip.style.display = "block";
      tooltip.style.opacity = "1";
    });

    element.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
      setTimeout(() => {
        if (tooltip.style.opacity === "0") {
          tooltip.style.display = "none";
        }
      }, CONSTANTS.ANIMATION.TOOLTIP_FADE_DELAY);
    });

    return tooltip;
  }

  // ============================================================================
  // Link Insertion
  // ============================================================================

  function insertEventTypeLink(eventType: EventType) {
    const bookingUrl = buildBookingUrl(eventType);
    const inserted = insertTextAtCursor(bookingUrl);

    if (inserted) {
      showNotification("Link inserted", "success");
    } else {
      navigator.clipboard
        .writeText(bookingUrl)
        .then(() => {
          showNotification("Link copied!", "success");
        })
        .catch(() => {
          showNotification("Failed to copy link", "error");
        });
    }
  }

  function insertTextAtCursor(text: string): boolean {
    const messageInput = findMessageInput();
    if (!messageInput) {
      return false;
    }

    messageInput.focus();
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      appendTextToEnd(messageInput, text, selection);
      return true;
    }

    insertTextAtSelection(text, selection, messageInput);
    return true;
  }

  function findMessageInput(): HTMLElement | null {
    for (const selector of CONSTANTS.SELECTORS.MESSAGE_INPUT) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) return element;
    }
    return null;
  }

  function appendTextToEnd(messageInput: HTMLElement, text: string, selection: Selection | null) {
    const textNode = document.createTextNode(` ${text} `);
    messageInput.appendChild(textNode);

    const range = document.createRange();
    range.setStartAfter(textNode);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function insertTextAtSelection(text: string, selection: Selection, messageInput: HTMLElement) {
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(` ${text} `);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    messageInput.dispatchEvent(new Event("input", { bubbles: true }));
    messageInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // ============================================================================
  // Notification & Sidebar
  // ============================================================================

  function showNotification(message: string, type: "success" | "error") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 80px;
      padding: 10px 12px;
      background: ${type === "success" ? CONSTANTS.COLORS.NOTIFICATION_SUCCESS : CONSTANTS.COLORS.NOTIFICATION_ERROR};
      color: white;
      border: 1px solid #2b2b2b;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;

    if (type === "success") {
      const checkIcon = document.createElement("span");
      checkIcon.innerHTML = SVG_ICONS.CHECK;
      checkIcon.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      `;
      notification.appendChild(checkIcon);
    }

    const messageText = document.createElement("span");
    messageText.textContent = message;
    notification.appendChild(messageText);

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateY(10px)";
      setTimeout(() => {
        notification.remove();
      }, CONSTANTS.ANIMATION.NOTIFICATION_FADE_OUT);
    }, CONSTANTS.ANIMATION.NOTIFICATION_DURATION);
  }

  function openCalSidebar() {
    window.dispatchEvent(new CustomEvent("cal-companion-open-sidebar"));
  }

  // ============================================================================
  // Styles
  // ============================================================================

  function injectStyles() {
    if (document.getElementById("cal-linkedin-styles")) {
      return;
    }

    const styleSheet = document.createElement("style");
    styleSheet.id = "cal-linkedin-styles";
    styleSheet.textContent = `
      .cal-companion-linkedin-menu::-webkit-scrollbar {
        width: 6px;
      }
      .cal-companion-linkedin-menu::-webkit-scrollbar-track {
        background: transparent;
        border-radius: 3px;
      }
      .cal-companion-linkedin-menu::-webkit-scrollbar-thumb {
        background-color: #c1c1c1;
        border-radius: 3px;
      }
      .cal-companion-linkedin-menu::-webkit-scrollbar-thumb:hover {
        background-color: #a1a1a1;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // ============================================================================
  // ============================================================================
  // Initialization
  // ============================================================================

  setTimeout(injectCalButton, 1000);

  const observer = new MutationObserver(() => {
    injectCalButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  let currentUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      setTimeout(injectCalButton, 500);
    }
  }, 1000);
}
