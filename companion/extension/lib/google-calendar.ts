/// <reference types="chrome" />

// Google Calendar integration: inject a no-show toggle next to attendees in event popups.
const bookingStatusCache = new Map<string, { data: Map<string, boolean>; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache
let authStatusCache: { isAuthenticated: boolean; timestamp: number } | null = null;
const AUTH_CACHE_TTL = 5000; // 5 seconds
const NO_SHOW_BUTTON_SELECTOR = "[data-cal-noshow-btn]";

async function getIsAuthenticatedCached(): Promise<boolean> {
  const now = Date.now();
  if (authStatusCache && now - authStatusCache.timestamp < AUTH_CACHE_TTL) {
    return authStatusCache.isAuthenticated;
  }

  const authResponse = await new Promise<{ isAuthenticated: boolean }>((resolve) => {
    chrome.runtime.sendMessage({ action: "check-auth-status" }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ isAuthenticated: false });
      } else {
        resolve(response || { isAuthenticated: false });
      }
    });
  });

  authStatusCache = { isAuthenticated: authResponse.isAuthenticated, timestamp: now };
  return authResponse.isAuthenticated;
}

// Styles for injected elements
const STYLES = `
  .cal-noshow-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px 10px;
    height: 24px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    border: 1px solid #dadce0;
    background-color: #ffffff;
    color: #3c4043;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    vertical-align: middle;
    white-space: nowrap;
  }

  .cal-noshow-btn:hover {
    background-color: #f8f9fa;
    border-color: #bdc1c6;
    color: #202124;
  }

  .cal-noshow-btn:active {
    background-color: #f1f3f4;
    border-color: #bdc1c6;
  }

  .cal-noshow-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f8f9fa;
  }

  .cal-noshow-btn.loading {
    opacity: 0.7;
    pointer-events: none;
  }

  .cal-noshow-btn.marked {
    background-color: #f8f9fa;
    border-color: #5f6368;
    color: #202124;
  }

  .cal-noshow-btn.marked:hover {
    background-color: #e8eaed;
    border-color: #3c4043;
  }

  .cal-noshow-btn-icon {
    width: 16px;
    height: 16px;
    display: block;
    flex-shrink: 0;
  }

  .cal-noshow-btn-container {
    display: inline-flex;
    align-items: center;
    margin-left: 12px;
    vertical-align: middle;
  }

  [data-cal-noshow-marked="true"] .SDqFWd span,
  [data-cal-noshow-marked="true"] .SDqFWd {
    text-decoration: line-through;
    color: #5f6368;
  }


  .cal-noshow-spinner {
    width: 10px;
    height: 10px;
    border: 2px solid #dadce0;
    border-top-color: #5f6368;
    border-radius: 50%;
    animation: cal-spin 0.6s linear infinite;
  }

  @keyframes cal-spin {
    to { transform: rotate(360deg); }
  }

  .cal-noshow-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
  }

  .cal-noshow-dialog {
    background-color: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  }

  .cal-noshow-dialog h3 {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 500;
    color: #111827;
  }

  .cal-noshow-dialog p {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.5;
  }

  .cal-noshow-dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .cal-noshow-dialog-btn {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  }

  .cal-noshow-dialog-btn.cancel {
    background-color: white;
    border: 1px solid #d1d5db;
    color: #374151;
  }

  .cal-noshow-dialog-btn.cancel:hover {
    background-color: #f9fafb;
  }

  .cal-noshow-dialog-btn.confirm {
    background-color: #202124;
    border: 1px solid #202124;
    color: white;
  }

  .cal-noshow-dialog-btn.confirm:hover {
    background-color: #000000;
  }

  .cal-noshow-dialog-btn.undo {
    background-color: #202124;
    border: 1px solid #202124;
    color: white;
  }

  .cal-noshow-dialog-btn.undo:hover {
    background-color: #000000;
  }

  .cal-noshow-alert {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 16px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    z-index: 2147483647;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    animation: cal-fade-in 0.3s ease;
    min-width: 200px;
    text-align: center;
  }

  .cal-noshow-alert.error {
    background-color: #ffffff;
    border: 1px solid #dadce0;
    color: #202124;
  }

  .cal-noshow-alert.success {
    background-color: #ffffff;
    border: 1px solid #dadce0;
    color: #202124;
  }

  .cal-noshow-alert.info {
    background-color: #ffffff;
    border: 1px solid #dadce0;
    color: #202124;
  }

  @keyframes cal-fade-in {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
`;

function setAttendeeMarkedVisual(attendeeElement: Element | null, marked: boolean): void {
  if (!attendeeElement) return;
  if (marked) {
    attendeeElement.setAttribute("data-cal-noshow-marked", "true");
  } else {
    attendeeElement.removeAttribute("data-cal-noshow-marked");
  }
}

// Inject styles into the page
function injectStyles(): void {
  if (document.getElementById("cal-noshow-styles")) return;

  const styleSheet = document.createElement("style");
  styleSheet.id = "cal-noshow-styles";
  styleSheet.textContent = STYLES;
  document.head.appendChild(styleSheet);
}

/**
 * Extract booking UID from event description
 * Looks for patterns like: https://cal.com/booking/{uid} or https://app.cal.com/booking/{uid}
 */
function extractBookingUid(text: string): string | null {
  const regex = /https:\/\/(?:app\.)?cal\.com\/booking\/([a-zA-Z0-9]+)/;
  const match = text.match(regex);
  return match ? match[1] : null;
}

/**
 * Check if an event is in the past
 */
function isEventInPast(eventElement: Element): boolean {
  const now = new Date();
  const dateTimeText = eventElement.textContent || "";

  // Try to infer the end time from the popup text (best effort).
  const datePatterns = [
    // Full date format: "Saturday, 20 December 2024⋅11:00 – 11:30am"
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{4}))?/i,
    // Short date format: "Dec 20, 2024"
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
    // Numeric format: "12/20/2024" or "20/12/2024"
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
  ];

  const months: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };

  for (const pattern of datePatterns) {
    const match = dateTimeText.match(pattern);
    if (match) {
      let day: number, month: number, year: number;

      if (pattern === datePatterns[0]) {
        // Format: "20 December 2024"
        day = parseInt(match[1], 10);
        month = months[match[2].toLowerCase()];
        year = match[3] ? parseInt(match[3], 10) : now.getFullYear();
      } else if (pattern === datePatterns[1]) {
        // Format: "December 20, 2024"
        month = months[match[1].toLowerCase()];
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
      } else {
        // Format: "12/20/2024" or "20/12/2024"
        // Assume US format (MM/DD/YYYY) first, fallback to DD/MM/YYYY
        const first = parseInt(match[1], 10);
        const second = parseInt(match[2], 10);
        year = parseInt(match[3], 10);

        if (first > 12) {
          // DD/MM/YYYY format
          day = first;
          month = second - 1;
        } else {
          // MM/DD/YYYY format
          month = first - 1;
          day = second;
        }
      }

      // Extract end time if available to check if event has ended
      const timeMatch = dateTimeText.match(/(\d{1,2}):(\d{2})\s*(?:AM|PM|am|pm)?/g);
      if (timeMatch && timeMatch.length > 0) {
        // Use the last time (end time)
        const lastTime = timeMatch[timeMatch.length - 1];
        const timeParts = lastTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);
          const isPM = timeParts[3]?.toUpperCase() === "PM";

          if (isPM && hours !== 12) {
            hours += 12;
          } else if (!isPM && hours === 12) {
            hours = 0;
          }

          const eventDate = new Date(year, month, day, hours, minutes);
          return eventDate < now;
        }
      }

      // If no time found, check if the date itself is in the past
      const eventDate = new Date(year, month, day, 23, 59, 59);
      return eventDate < now;
    }
  }

  // Fallback: data attributes (if present).
  const eventStartAttr =
    eventElement.getAttribute("data-start") || eventElement.getAttribute("data-event-start");
  if (eventStartAttr) {
    try {
      const eventDate = new Date(eventStartAttr);
      if (!Number.isNaN(eventDate.getTime())) {
        return eventDate < now;
      }
    } catch {
      // Invalid date, continue to next strategy
    }
  }

  // Fallback: CSS/aria hints.
  const hasPastIndicator =
    eventElement.classList.contains("past") ||
    eventElement.classList.contains("completed") ||
    eventElement.getAttribute("aria-label")?.toLowerCase().includes("past") ||
    eventElement.querySelector(".past, .completed") !== null;

  if (hasPastIndicator) {
    return true;
  }

  // Fallback: keyword hints.
  const pastKeywords = ["ended", "was", "past meeting", "completed", "finished"];
  const textLower = dateTimeText.toLowerCase();
  if (pastKeywords.some((keyword) => textLower.includes(keyword))) {
    // Additional check: make sure it's not a future event description
    const futureKeywords = ["will", "upcoming", "scheduled for", "starts"];
    if (!futureKeywords.some((keyword) => textLower.includes(keyword))) {
      return true;
    }
  }

  // Default: assume not past if we can't determine
  return false;
}

/**
 * Parse attendee information from the event popup
 */
interface AttendeeInfo {
  name: string;
  email: string;
  isOrganizer: boolean;
  element: Element;
}

function parseAttendees(eventPopup: Element): AttendeeInfo[] {
  const attendees: AttendeeInfo[] = [];
  const seenEmails = new Set<string>();

  // Prefer Google Calendar attendee rows.
  const attendeeItems = eventPopup.querySelectorAll('[role="treeitem"][data-email]');

  attendeeItems.forEach((el) => {
    const email = el.getAttribute("data-email");
    if (!email || seenEmails.has(email.toLowerCase())) {
      return;
    }
    seenEmails.add(email.toLowerCase());

    // Check if this is an organizer using aria-label
    const ariaLabel = el.getAttribute("aria-label") || "";
    const isOrganizer =
      ariaLabel.toLowerCase().includes("organiser") ||
      ariaLabel.toLowerCase().includes("organizer") ||
      el.textContent?.toLowerCase().includes("organiser") ||
      el.textContent?.toLowerCase().includes("organizer");

    // Extract name from the SDqFWd span (Google Calendar's name display)
    let name = email.split("@")[0];
    const nameSpan = el.querySelector(".SDqFWd span");
    if (nameSpan?.textContent) {
      const nameText = nameSpan.textContent.trim();
      // Only use if it's not just the email
      if (nameText !== email && nameText.includes("@") === false) {
        name = nameText;
      }
    } else {
      // Fallback: try to extract from aria-label
      const labelMatch = ariaLabel.match(/^([^,]+)/);
      if (labelMatch && labelMatch[1] !== email) {
        name = labelMatch[1].trim();
      }
    }

    attendees.push({
      name: name || email.split("@")[0],
      email: email,
      isOrganizer,
      element: el,
    });
  });

  // Fallbacks (DOM variants, then text parsing).
  const allText = eventPopup.innerHTML || eventPopup.textContent || "";
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

  if (attendees.length === 0) {
    const guestSelectors = [
      "[data-email]",
      "[data-guest-email]",
      "[data-attendee-email]",
      '[role="listitem"][data-email]',
      "[data-email-id]",
      '[jsname="xR2lFb"]',
      '[jsname="xR2lFb"] [data-email]',
      "[data-attendee]",
      "[data-participant]",
    ];

    for (const selector of guestSelectors) {
      const guestElements = eventPopup.querySelectorAll(selector);
      guestElements.forEach((el) => {
        const email =
          el.getAttribute("data-email") ||
          el.getAttribute("data-guest-email") ||
          el.getAttribute("data-attendee-email") ||
          el.getAttribute("data-email-id");

        if (email && !seenEmails.has(email.toLowerCase())) {
          seenEmails.add(email.toLowerCase());

          // Check if this is an organizer
          const text = (el.textContent || "").toLowerCase();
          const ariaLabel = el.getAttribute("aria-label") || "";
          const isOrganizer =
            text.includes("organiser") ||
            text.includes("organizer") ||
            ariaLabel.toLowerCase().includes("organiser") ||
            ariaLabel.toLowerCase().includes("organizer") ||
            el.getAttribute("data-organizer") === "true" ||
            el.closest('[data-organizer="true"]') !== null;

          // Extract name
          let name = email.split("@")[0];
          const nameElement = el.querySelector("[data-name], [data-display-name], .SDqFWd span");
          if (nameElement) {
            const nameText =
              nameElement.textContent ||
              nameElement.getAttribute("data-name") ||
              nameElement.getAttribute("data-display-name");
            if (nameText && nameText !== email && !nameText.includes("@")) {
              name = nameText.trim();
            }
          } else {
            // Try to extract name from text content
            const textContent = el.textContent || "";
            const nameMatch = textContent.match(
              /^([^@\n]+?)(?:\s*[-–]\s*)?(?:organizer|organiser)?\s*$/i
            );
            if (nameMatch && nameMatch[1].trim() !== email) {
              name = nameMatch[1].trim();
            }
          }

          attendees.push({
            name: name || email.split("@")[0],
            email: email,
            isOrganizer,
            element: el,
          });
        }
      });
    }
  }

  // Fallback: parse from "Who:" section.
  if (attendees.length === 0) {
    const whoSection = allText.match(/Who:([\s\S]*?)(?:Where:|When:|$)/i);
    if (whoSection) {
      const whoText = whoSection[1];
      const whoEmails: string[] = whoText.match(emailRegex) ?? [];

      whoEmails.forEach((email) => {
        const emailLower = email.toLowerCase();
        if (seenEmails.has(emailLower)) return;
        seenEmails.add(emailLower);

        const isOrganizer =
          whoText.toLowerCase().includes(`${emailLower}`) &&
          (whoText.toLowerCase().includes("organizer") ||
            whoText.toLowerCase().includes("organiser"));

        // Try to find the name associated with this email
        const nameMatch = whoText.match(
          new RegExp(
            `([^\\n]+?)\\s*[-–]?\\s*(?:Organizer|Organiser)?\\s*${email.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )}`,
            "i"
          )
        );

        attendees.push({
          name: nameMatch ? nameMatch[1].trim() : email.split("@")[0],
          email: email,
          isOrganizer,
          element: eventPopup,
        });
      });
    }
  }

  // Fallback: scan guest list containers.
  if (attendees.length === 0) {
    const guestListContainers = eventPopup.querySelectorAll(
      '[data-guests], [aria-label*="guest" i], [aria-label*="attendee" i], [jsname="xR2lFb"]'
    );

    guestListContainers.forEach((container) => {
      const containerText = container.textContent || "";
      const emails: string[] = containerText.match(emailRegex) ?? [];

      emails.forEach((email) => {
        const emailLower = email.toLowerCase();
        if (seenEmails.has(emailLower)) return;
        seenEmails.add(emailLower);

        const text = containerText.toLowerCase();
        const isOrganizer =
          text.includes("organiser") ||
          text.includes("organizer") ||
          container.querySelector('[aria-label*="organizer" i]') !== null;

        // Find the specific element containing this email
        const emailElement = Array.from(container.querySelectorAll("*")).find((el) =>
          el.textContent?.includes(email)
        );

        const nameMatch = containerText.match(
          new RegExp(
            `([^\\n]+?)\\s*[-–]?\\s*(?:Organizer|Organiser)?\\s*${email.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )}`,
            "i"
          )
        );

        attendees.push({
          name: nameMatch ? nameMatch[1].trim() : email.split("@")[0],
          email: email,
          isOrganizer,
          element: emailElement || container,
        });
      });
    });
  }

  return attendees;
}

/**
 * Show confirmation dialog
 */
function showConfirmDialog(
  attendeeEmail: string,
  isUndo: boolean,
  onConfirm: () => void,
  onCancel: () => void
): void {
  const overlay = document.createElement("div");
  overlay.className = "cal-noshow-dialog-overlay";

  const dialog = document.createElement("div");
  dialog.className = "cal-noshow-dialog";

  const title = isUndo ? "Undo No Show?" : "Mark as No Show?";
  const message = isUndo
    ? `Remove the no-show status from "${attendeeEmail}"?`
    : `Mark "${attendeeEmail}" as no-show for this meeting?`;
  const confirmClass = isUndo ? "undo" : "confirm";
  const confirmText = "Confirm";

  dialog.innerHTML = `
    <h3>${title}</h3>
    <p>${message}</p>
    <div class="cal-noshow-dialog-buttons">
      <button class="cal-noshow-dialog-btn cancel">Cancel</button>
      <button class="cal-noshow-dialog-btn ${confirmClass}">${confirmText}</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const cancelBtn = dialog.querySelector(".cancel");
  const confirmBtn = dialog.querySelector(`.${confirmClass}`);

  const cleanup = () => {
    overlay.remove();
  };

  cancelBtn?.addEventListener("click", () => {
    cleanup();
    onCancel();
  });

  confirmBtn?.addEventListener("click", () => {
    cleanup();
    onConfirm();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      cleanup();
      onCancel();
    }
  });
}

/**
 * Show alert message
 */
function showAlert(message: string, type: "error" | "success" | "info" = "info"): void {
  // Remove existing alerts
  for (const el of document.querySelectorAll(".cal-noshow-alert")) {
    el.remove();
  }

  const alert = document.createElement("div");
  alert.className = `cal-noshow-alert ${type}`;
  alert.textContent = message;
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 1200);
}

/**
 * Open the companion sidebar for login
 */
function openSidebarForLogin(): void {
  // Dispatch custom event that content script listens for
  window.dispatchEvent(new CustomEvent("cal-companion-open-sidebar"));
}

/**
 * Handle mark no-show button click
 */
async function handleMarkNoShow(
  container: HTMLDivElement,
  bookingUid: string,
  attendeeEmail: string,
  isCurrentlyMarked: boolean
): Promise<void> {
  // Check authentication first
  if (!(await getIsAuthenticatedCached())) {
    // Not logged in - open sidebar for login (no alert, just open sidebar)
    openSidebarForLogin();
    return;
  }

  // If no booking UID, show error
  if (!bookingUid) {
    showAlert("Not a Cal.com booking", "info");
    return;
  }

  // Show confirmation dialog
  showConfirmDialog(
    attendeeEmail,
    isCurrentlyMarked,
    async () => {
      // Set loading state
      const button = container.querySelector(".cal-noshow-btn") as HTMLButtonElement;

      if (button) {
        button.classList.add("loading");
        button.disabled = true;
      }

      const originalButtonContent = button?.innerHTML || "";
      if (button) {
        button.innerHTML = '<div class="cal-noshow-spinner"></div>';
      }

      try {
        const response = await new Promise<{ success: boolean; error?: string }>((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: "mark-no-show",
              payload: {
                bookingUid,
                attendeeEmail,
                absent: !isCurrentlyMarked,
              },
            },
            (res) => {
              if (chrome.runtime.lastError) {
                // Handle network errors
                const errorMsg =
                  chrome.runtime.lastError.message ||
                  "Network error. Please check your connection and try again.";
                resolve({ success: false, error: errorMsg });
              } else {
                resolve(res || { success: false, error: "No response" });
              }
            }
          );
        });

        if (response.success) {
          // Invalidate cache so next time we fetch fresh data
          if (bookingUid) {
            bookingStatusCache.delete(bookingUid);
          }

          // Update button state - re-find button in case DOM changed
          const updatedButton = container.querySelector(".cal-noshow-btn") as HTMLButtonElement;
          const buttonToUpdate = updatedButton || button;

          if (!isCurrentlyMarked) {
            // Mark as no-show
            if (buttonToUpdate) {
              buttonToUpdate.classList.add("marked");
              buttonToUpdate.innerHTML = `${createEyeIcon()}<span>Unmark no-show</span>`;
              buttonToUpdate.setAttribute("aria-label", "Unmark no-show");
            }
            container.dataset.marked = "true";
            setAttendeeMarkedVisual(
              container.closest('[role="treeitem"][data-email]') ??
                container.closest("[data-email]"),
              true
            );
            showAlert("Marked as no-show", "success");
          } else {
            // Unmark no-show
            if (buttonToUpdate) {
              buttonToUpdate.classList.remove("marked");
              buttonToUpdate.innerHTML = `${createNoShowIcon()}<span>Mark as no-show</span>`;
              buttonToUpdate.setAttribute("aria-label", "Mark as no-show");
            }
            container.dataset.marked = "false";
            setAttendeeMarkedVisual(
              container.closest('[role="treeitem"][data-email]') ??
                container.closest("[data-email]"),
              false
            );
            showAlert("No-show status removed", "success");
          }
        } else {
          // Handle specific error messages
          let errorMessage = response.error || "Failed to mark no-show. Please try again.";

          // Map error messages to user-friendly ones
          if (response.error?.includes("401") || response.error?.includes("Session expired")) {
            errorMessage = "Session expired. Please login again.";
          } else if (response.error?.includes("403") || response.error?.includes("permission")) {
            errorMessage = "You don't have permission to modify this booking.";
          } else if (response.error?.includes("404") || response.error?.includes("not found")) {
            errorMessage = "Booking not found in Cal.com.";
          } else if (response.error?.includes("Network") || response.error?.includes("network")) {
            errorMessage = "Network error. Please check your connection and try again.";
          }

          if (button) {
            button.innerHTML = originalButtonContent;
          }
          showAlert(errorMessage, "error");
        }
      } catch (error) {
        if (button) {
          button.innerHTML = originalButtonContent;
        }
        const errorMessage =
          error instanceof Error ? error.message : "Failed to mark no-show. Please try again.";
        showAlert(errorMessage, "error");
      } finally {
        if (button) {
          button.classList.remove("loading");
          button.disabled = false;
        }
      }
    },
    () => {
      // Cancel - do nothing
    }
  );
}

/**
 * Create SVG icon for "Mark as no-show" (eye with slash)
 */
function createNoShowIcon(): string {
  return `<svg class="cal-noshow-btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
<line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;
}

/**
 * Create SVG icon for "Unmark no-show" (regular eye)
 */
function createEyeIcon(): string {
  return `<svg class="cal-noshow-btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
</svg>`;
}

/**
 * Create a "Mark No Show" button container for an attendee
 * Returns a container div with icon + text button
 */
function createNoShowButton(
  bookingUid: string,
  attendee: AttendeeInfo,
  isMarked: boolean = false
): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "cal-noshow-btn-container";
  container.dataset.attendeeEmail = attendee.email;
  container.dataset.marked = isMarked ? "true" : "false";
  container.dataset.calNoshowBtn = "true";
  container.dataset.bookingUid = bookingUid || "";

  // Create button with icon and text
  const button = document.createElement("button");
  button.className = `cal-noshow-btn ${isMarked ? "marked" : ""}`;
  const iconHtml = isMarked ? createEyeIcon() : createNoShowIcon();
  const text = isMarked ? "Unmark no-show" : "Mark as no-show";
  button.innerHTML = `${iconHtml}<span>${text}</span>`;
  button.dataset.attendeeEmail = attendee.email;
  button.setAttribute("aria-label", text);

  const handleClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    const currentlyMarked = container.dataset.marked === "true";
    // Read the latest booking UID from the DOM at click-time (popup content can render in phases)
    const latestBookingUid = container.dataset.bookingUid || bookingUid;
    handleMarkNoShow(container, latestBookingUid, attendee.email, currentlyMarked);
  };

  button.addEventListener("click", handleClick);
  container.appendChild(button);

  return container;
}

/**
 * Inject no-show buttons into an event popup
 */
async function injectNoShowButtons(eventPopup: Element): Promise<void> {
  // Get the event description text
  const popupText = eventPopup.textContent || "";

  // Extract booking UID
  const bookingUid = extractBookingUid(popupText);

  // Check if this is a past event
  const isPast = isEventInPast(eventPopup);

  if (!isPast) {
    // Not a past event, don't show buttons
    return;
  }

  // Parse attendees
  const attendees = parseAttendees(eventPopup);

  // Filter out organizers and hosts (we only mark attendees, not the host/organizer)
  // Also filter out the current user if they're the organizer
  const nonOrganizerAttendees = attendees.filter((a) => {
    // Exclude if marked as organizer
    if (a.isOrganizer) {
      return false;
    }

    // Additional check: exclude if the element or parent has organizer indicators
    const element = a.element;
    const hasOrganizerIndicator =
      element.getAttribute("data-organizer") === "true" ||
      element.closest('[data-organizer="true"]') !== null ||
      element.querySelector('[aria-label*="organizer" i]') !== null ||
      element.querySelector('[aria-label*="organiser" i]') !== null ||
      (element.textContent || "").toLowerCase().includes("organizer") ||
      (element.textContent || "").toLowerCase().includes("organiser");

    return !hasOrganizerIndicator;
  });

  if (nonOrganizerAttendees.length === 0) {
    return;
  }

  // Per requirements: Show button even for non-Cal.com events, but it will show error on click
  // This allows users to see the feature is available

  const existingButtonContainers = Array.from(
    eventPopup.querySelectorAll(".cal-noshow-btn-container[data-attendee-email]")
  ) as HTMLDivElement[];

  const existingButtonByEmail = new Map<string, HTMLDivElement>();
  existingButtonContainers.forEach((el) => {
    const email = el.getAttribute("data-attendee-email")?.toLowerCase();
    if (email) existingButtonByEmail.set(email, el);
  });

  const attendeesToInject = nonOrganizerAttendees.filter(
    (a) => !existingButtonByEmail.has(a.email.toLowerCase())
  );

  type BookingStatusAttendee = { email: string; noShow?: boolean; absent?: boolean };
  type BookingStatusPayload = { attendees?: BookingStatusAttendee[] };
  type BookingStatusMessageResponse =
    | { success: true; data: BookingStatusPayload }
    | { success: false; error?: string };

  // Fetch booking status to compute initial mark/unmark state.
  const attendeeNoShowStatus = new Map<string, boolean>();

  if (bookingUid && (await getIsAuthenticatedCached())) {
    // Check cache first
    const cached = bookingStatusCache.get(bookingUid);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      // Use cached data
      cached.data.forEach((value, key) => {
        attendeeNoShowStatus.set(key, value);
      });
    } else {
      const statusResponse = await new Promise<BookingStatusMessageResponse>((resolve) => {
        chrome.runtime.sendMessage(
          { action: "get-booking-status", payload: { bookingUid } },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            if (response && typeof response === "object" && "success" in response) {
              resolve(response as BookingStatusMessageResponse);
              return;
            }
            resolve({ success: false });
          }
        );
      });

      if (statusResponse.success && statusResponse.data.attendees) {
        statusResponse.data.attendees.forEach((att) => {
          attendeeNoShowStatus.set(
            att.email.toLowerCase(),
            att.noShow === true || att.absent === true
          );
        });

        bookingStatusCache.set(bookingUid, {
          data: new Map(attendeeNoShowStatus),
          timestamp: now,
        });
      }
    }
  }

  // Sync existing buttons (e.g. when bookingUid appears after initial injection)
  if (bookingUid && existingButtonByEmail.size > 0) {
    nonOrganizerAttendees.forEach((attendee) => {
      const emailLower = attendee.email.toLowerCase();
      const existingContainer = existingButtonByEmail.get(emailLower);
      if (!existingContainer) return;

      // Ensure click-time booking UID is correct even if we injected before the link rendered
      if (!existingContainer.dataset.bookingUid) existingContainer.dataset.bookingUid = bookingUid;

      if (attendeeNoShowStatus.size === 0) return;

      const shouldBeMarked = attendeeNoShowStatus.get(emailLower) || false;
      const currentlyMarked = existingContainer.dataset.marked === "true";
      if (shouldBeMarked === currentlyMarked) return;

      const btn = existingContainer.querySelector(".cal-noshow-btn") as HTMLButtonElement | null;
      if (btn) {
        if (shouldBeMarked) {
          btn.classList.add("marked");
          btn.innerHTML = `${createEyeIcon()}<span>Unmark no-show</span>`;
          btn.setAttribute("aria-label", "Unmark no-show");
        } else {
          btn.classList.remove("marked");
          btn.innerHTML = `${createNoShowIcon()}<span>Mark as no-show</span>`;
          btn.setAttribute("aria-label", "Mark as no-show");
        }
      }
      setAttendeeMarkedVisual(
        existingContainer.closest('[role="treeitem"][data-email]') ??
          existingContainer.closest("[data-email]") ??
          attendee.element,
        shouldBeMarked
      );
      existingContainer.dataset.marked = shouldBeMarked ? "true" : "false";
    });
  }

  if (attendeesToInject.length === 0) {
    // Nothing new to inject (but we may have synced existing buttons above)
    return;
  }

  attendeesToInject.forEach((attendee) => {
    // Check if this attendee is already marked as no-show
    const isMarked = attendeeNoShowStatus.get(attendee.email.toLowerCase()) || false;

    // Create and inject button container
    const buttonContainer = createNoShowButton(bookingUid || "", attendee, isMarked);
    // Button will always show, even without booking UID
    // The click handler will check auth and booking UID when clicked

    // Strategy: Place button IN FRONT OF attendee name
    // Insert before the name span (.SDqFWd span)
    let inserted = false;

    if (attendee.element && attendee.element !== eventPopup) {
      // Find the name container and name span
      const nameContainer = attendee.element.querySelector(".toUqff.DbpAnb, .CVKLNd");
      const nameSpan = nameContainer
        ? nameContainer.querySelector(".SDqFWd span, .SDqFWd")
        : attendee.element.querySelector(".SDqFWd span, .SDqFWd");

      if (nameSpan?.parentElement) {
        // Insert button AFTER the name span (on the right side)
        // Check if button already exists at this location
        const parent = nameSpan.parentElement;
        const existingBtn = parent.querySelector(`[data-attendee-email="${attendee.email}"]`);
        if (existingBtn) {
          return; // Skip if already exists
        }

        // Insert after the name span
        parent.insertBefore(buttonContainer, nameSpan.nextSibling);
        inserted = true;
      } else if (nameContainer) {
        // Fallback: Insert at the beginning of the name container
        const existingBtn = nameContainer.querySelector(
          `[data-attendee-email="${attendee.email}"]`
        );
        if (existingBtn) {
          return; // Skip if already exists
        }

        const firstChild = nameContainer.firstChild;
        if (firstChild) {
          nameContainer.insertBefore(buttonContainer, firstChild);
        } else {
          nameContainer.appendChild(buttonContainer);
        }
        inserted = true;
      } else {
        // Fallback: Find the content div and insert at the beginning
        const contentDiv = attendee.element.querySelector(".toUqff, .CVKLNd, .UfeRlc");
        if (contentDiv) {
          const existingBtn = contentDiv.querySelector(`[data-attendee-email="${attendee.email}"]`);
          if (existingBtn) {
            return; // Skip if already exists
          }

          const firstChild = contentDiv.firstChild;
          if (firstChild) {
            contentDiv.insertBefore(buttonContainer, firstChild);
          } else {
            contentDiv.appendChild(buttonContainer);
          }
          inserted = true;
        } else {
          // Last resort: prepend to the attendee element itself
          const existingBtn = attendee.element.querySelector(
            `[data-attendee-email="${attendee.email}"]`
          );
          if (existingBtn) {
            return; // Skip if already exists
          }

          const firstChild = attendee.element.firstChild;
          if (firstChild) {
            attendee.element.insertBefore(buttonContainer, firstChild);
          } else {
            attendee.element.appendChild(buttonContainer);
          }
          inserted = true;
        }
      }
    }

    // Fallback: If we couldn't insert using the structure, try finding by email
    if (!inserted) {
      // Look for the element with this email
      const emailElement = eventPopup.querySelector(`[data-email="${attendee.email}"]`);
      if (emailElement && emailElement !== eventPopup) {
        const nameSpan = emailElement.querySelector(".SDqFWd span, .SDqFWd");
        if (nameSpan?.parentElement) {
          nameSpan.parentElement.insertBefore(buttonContainer, nameSpan.nextSibling);
          inserted = true;
        } else if (emailElement.parentElement) {
          emailElement.parentElement.insertBefore(buttonContainer, emailElement.nextSibling);
          inserted = true;
        }
      }
    }

    setAttendeeMarkedVisual(attendee.element, isMarked);
  });
}

/**
 * Observe DOM for event popups and inject buttons
 */
function observeEventPopups(): void {
  // Track button injection attempts to avoid infinite loops
  const injectionAttempts = new WeakMap<Element, number>();
  const MAX_INJECTION_ATTEMPTS = 10;
  // Throttle sync attempts per popup (for phased rendering / login while open)
  const lastSyncAttempt = new WeakMap<Element, number>();
  const SYNC_ATTEMPT_TTL = 2000; // 2 seconds

  // Function to check and inject buttons
  const checkAndInject = (element: Element, force: boolean = false) => {
    const attempts = injectionAttempts.get(element) || 0;

    // Prevent infinite injection loops
    if (!force && attempts >= MAX_INJECTION_ATTEMPTS) {
      return;
    }

    const text = element.textContent || "";
    // Check if this looks like a Cal.com event
    const isCalComEvent =
      text.includes("cal.com") ||
      text.includes("Cal.com") ||
      text.includes("booking") ||
      extractBookingUid(text) !== null;

    if (isCalComEvent) {
      // Check if buttons already exist
      const existingButtons = element.querySelectorAll(NO_SHOW_BUTTON_SELECTOR);
      const hasValidButtons = Array.from(existingButtons).some((btn) => {
        const style = window.getComputedStyle(btn);
        return btn.isConnected && style.display !== "none" && style.visibility !== "hidden";
      });

      // Only inject if buttons don't exist or were removed
      if (!hasValidButtons || force) {
        // Delay to let the popup fully render
        setTimeout(() => {
          void injectNoShowButtons(element);
          injectionAttempts.set(element, attempts + 1);
        }, 200);
        return;
      }

      // Buttons exist: still attempt a throttled "sync pass" so state can update once bookingUid/auth becomes available.
      const now = Date.now();
      const last = lastSyncAttempt.get(element) || 0;
      if (now - last < SYNC_ATTEMPT_TTL) return;

      if (extractBookingUid(text)) {
        lastSyncAttempt.set(element, now);
        setTimeout(() => {
          void injectNoShowButtons(element);
        }, 200);
      }
    }
  };

  // MutationObserver to watch for event popup appearance and changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Handle removed nodes - check if our buttons were removed
      if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
        mutation.removedNodes.forEach((removedNode) => {
          if (removedNode instanceof Element) {
            // Check if one of our buttons was removed
            const removedButton =
              removedNode.querySelector?.(NO_SHOW_BUTTON_SELECTOR) ||
              (removedNode.hasAttribute?.("data-cal-noshow-btn") ? removedNode : null);

            if (removedButton) {
              // Find the popup that contains this button's attendee
              const popup =
                mutation.target instanceof Element
                  ? mutation.target.closest('[role="dialog"], [aria-modal="true"], [data-eventid]')
                  : null;

              if (popup) {
                // Re-inject buttons if they were removed
                setTimeout(() => checkAndInject(popup, true), 100);
              }
            }
          }
        });
      }

      // Handle added nodes
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          // Look for event detail popups
          const eventPopups = node.querySelectorAll(
            '[data-eventid], [data-eventchip], [role="dialog"], [aria-modal="true"]'
          );

          eventPopups.forEach((popup) => {
            checkAndInject(popup);
          });

          // Also check if the added node itself is a popup
          if (
            node.matches('[data-eventid], [data-eventchip], [role="dialog"], [aria-modal="true"]')
          ) {
            checkAndInject(node);
          }

          // Check if attendee elements were added (Google Calendar might add them dynamically)
          if (node.querySelector?.('[role="treeitem"][data-email]')) {
            const popup = node.closest('[role="dialog"], [aria-modal="true"], [data-eventid]');
            if (popup) {
              checkAndInject(popup, true);
            }
          }
        }
      });

      // Handle attribute changes (Google Calendar might update content dynamically)
      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        const target = mutation.target;
        // Check if this is a popup or inside a popup
        const popup = target.closest('[role="dialog"], [aria-modal="true"], [data-eventid]');
        if (popup) {
          // Only re-inject if buttons are missing
          const hasButtons = popup.querySelector(NO_SHOW_BUTTON_SELECTOR);
          if (!hasButtons) {
            checkAndInject(popup);
          }
        }
      }

      // Handle character data changes (text content updates)
      if (mutation.type === "characterData" && mutation.target.parentElement) {
        const popup = mutation.target.parentElement.closest(
          '[role="dialog"], [aria-modal="true"], [data-eventid]'
        );
        if (popup) {
          const hasButtons = popup.querySelector(NO_SHOW_BUTTON_SELECTOR);
          if (!hasButtons) {
            checkAndInject(popup);
          }
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "aria-label"],
    characterData: true,
  });

  // Also check for existing popups on page load
  setTimeout(() => {
    const existingPopups = document.querySelectorAll(
      '[data-eventid], [data-eventchip], [role="dialog"][aria-modal="true"]'
    );
    existingPopups.forEach((popup) => {
      checkAndInject(popup);
    });
  }, 1000);

  // Periodically check for popups and verify buttons still exist (fallback)
  setInterval(() => {
    const allPopups = document.querySelectorAll(
      '[role="dialog"], [aria-modal="true"], [data-eventid]'
    );
    allPopups.forEach((popup) => {
      // Only check if popup is visible
      const style = window.getComputedStyle(popup);
      if (style.display === "none" || style.visibility === "hidden") {
        return;
      }

      // Check if this is a Cal.com event
      const text = popup.textContent || "";
      const isCalComEvent =
        text.includes("cal.com") ||
        text.includes("Cal.com") ||
        text.includes("booking") ||
        extractBookingUid(text) !== null;

      if (isCalComEvent) {
        // Check if buttons exist and are still attached
        const existingButtons = popup.querySelectorAll(NO_SHOW_BUTTON_SELECTOR);
        const validButtons = Array.from(existingButtons).filter((btn) => {
          const style = window.getComputedStyle(btn);
          return btn.isConnected && style.display !== "none" && style.visibility !== "hidden";
        });

        // If buttons are missing or removed, re-inject
        if (validButtons.length === 0) {
          checkAndInject(popup, true);
        }
      }
    });
  }, 1000);
}

/**
 * Initialize Google Calendar integration
 */
export function initGoogleCalendarIntegration(): void {
  // Inject styles
  injectStyles();

  // Start observing for event popups
  observeEventPopups();
}
