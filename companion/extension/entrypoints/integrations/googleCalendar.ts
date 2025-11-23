/**
 * Google Calendar Integration
 * Injects "Mark No Show" buttons into Google Calendar event popups for past Cal.com bookings
 */

export function initGoogleCalendarIntegration() {
  console.log("[Cal.com] Google Calendar integration initialized");

  // Cache for bookings (refreshed periodically)
  let bookingsCache: any[] | null = null;
  let cacheTimestamp: number | null = null;
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Track which events we've already processed
  const processedEvents = new Set<string>();

  // Function to inject "Mark No Show" buttons into calendar event details
  async function injectNoShowButtons() {
    try {
      console.log("[Cal.com] Checking for event details...");

      // Google Calendar shows event details in a popup/bubble that appears when clicking an event
      // This popup is typically a div with role="dialog" or a bubble element

      // Look for the event details popup - it usually has these characteristics:
      // - Contains event title, time, attendees, description
      // - Has role="dialog" or is a popup bubble
      // - Appears on top of the calendar

      let eventDetailsContainer = null;

      // Try to find dialog/popup containers
      const dialogElements = document.querySelectorAll('[role="dialog"]');
      console.log(`[Cal.com] Found ${dialogElements.length} dialog elements`);

      // Find the one that looks like an event details popup
      for (let i = 0; i < dialogElements.length; i++) {
        const dialog = dialogElements[i];
        const dialogText = dialog.textContent || "";
        // Event popups typically contain time information and attendee emails
        if (dialogText.includes("@") || dialogText.includes("AM") || dialogText.includes("PM")) {
          eventDetailsContainer = dialog;
          console.log("[Cal.com] Found event details dialog");
          break;
        }
      }

      // Fallback: try other selectors
      if (!eventDetailsContainer) {
        eventDetailsContainer =
          document.querySelector("[data-eventid]") ||
          document.querySelector("[data-draggable-id]") ||
          document.querySelector("div[jsname][data-is-popup='true']");
      }

      if (!eventDetailsContainer) {
        console.log("[Cal.com] No event details container found");
        return;
      }

      console.log("[Cal.com] Found event details container:", eventDetailsContainer);

      // Try to get a unique identifier for this event
      const eventId =
        eventDetailsContainer.getAttribute("data-eventid") ||
        eventDetailsContainer.getAttribute("data-draggable-id") ||
        eventDetailsContainer.getAttribute("data-eid") ||
        "unknown-" + Date.now();

      console.log("[Cal.com] Event ID:", eventId);

      if (processedEvents.has(eventId)) {
        console.log("[Cal.com] Event already processed:", eventId);
        return;
      }

      // Get bookings from cache or fetch fresh
      console.log("[Cal.com] Fetching bookings...");
      const bookings = await fetchBookings();
      console.log("[Cal.com] Bookings received:", bookings?.length || 0);

      if (!bookings || bookings.length === 0) {
        console.log("[Cal.com] No bookings found");
        return;
      }

      // Extract event information from the DOM
      console.log("[Cal.com] Extracting event info...");
      const eventInfo = extractEventInfo(eventDetailsContainer);
      console.log("[Cal.com] Event info:", eventInfo);

      if (!eventInfo || !eventInfo.title) {
        console.log("[Cal.com] Could not extract event info");
        return;
      }

      // Try to match this calendar event with a Cal.com booking
      console.log("[Cal.com] Matching event with bookings...");
      const matchedBooking = findMatchingBooking(eventInfo, bookings);
      console.log("[Cal.com] Matched booking:", matchedBooking);

      if (!matchedBooking) {
        console.log("[Cal.com] No matching booking found for:", eventInfo.title);
        return;
      }

      // Check if the booking has ended (only show button for past bookings)
      const endTimeValue = matchedBooking.endTime || matchedBooking.end;

      if (!endTimeValue) {
        console.log("[Cal.com] No end time found for booking:", matchedBooking.title);
        return;
      }

      const bookingEndTime = new Date(endTimeValue);

      // Validate the date is valid
      if (isNaN(bookingEndTime.getTime())) {
        console.log("[Cal.com] Invalid end time for booking:", endTimeValue);
        return;
      }

      const currentTime = new Date();
      const isPastBooking = bookingEndTime < currentTime;

      console.log("[Cal.com] Booking end time:", bookingEndTime.toISOString());
      console.log("[Cal.com] Current time:", currentTime.toISOString());
      console.log("[Cal.com] Is past booking:", isPastBooking);

      // Mark this event as processed
      processedEvents.add(eventId);
      console.log("[Cal.com] Processing event:", eventId, matchedBooking.title);

      // Find attendee elements and inject buttons
      console.log("[Cal.com] Finding attendee elements...");
      const attendeeElements = findAttendeeElements(eventDetailsContainer);
      console.log("[Cal.com] Found attendee elements:", attendeeElements.length);

      if (attendeeElements.length > 0) {
        // Found attendee elements in the DOM - inject buttons next to them
        attendeeElements.forEach((attendeeEl, index) => {
          const attendeeEmail = extractAttendeeEmail(attendeeEl);
          console.log(`[Cal.com] Attendee ${index + 1} email:`, attendeeEmail);

          if (!attendeeEmail) return;

          // Find this attendee in the booking
          const attendee = matchedBooking.attendees?.find(
            (a: any) => a.email.toLowerCase() === attendeeEmail.toLowerCase()
          );

          if (!attendee) {
            console.log("[Cal.com] Attendee not found in booking:", attendeeEmail);
            return;
          }

          console.log("[Cal.com] Injecting button for attendee:", attendee.email);
          // Inject the "Mark No Show" button
          injectNoShowButton(attendeeEl, attendee, matchedBooking, isPastBooking);
        });
      } else {
        // Couldn't find attendee elements - manually search and inject
        console.log("[Cal.com] No attendee elements found, searching for attendee section...");
        injectButtonsInAttendeeSection(eventDetailsContainer, matchedBooking, isPastBooking);
      }
    } catch (error) {
      console.error("Error injecting no-show buttons:", error);
    }
  }

  async function fetchBookings() {
    try {
      const now = Date.now();
      const isCacheValid = bookingsCache && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION;

      if (isCacheValid) {
        return bookingsCache!;
      }

      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        throw new Error("Extension context invalidated. Please reload the page.");
      }

      // Fetch bookings from background script
      const response = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ action: "fetch-bookings" }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        } catch (err) {
          reject(err);
        }
      });

      let bookings: any[] = [];
      if (response && (response as any).data) {
        bookings = (response as any).data;
      } else if (Array.isArray(response)) {
        bookings = response;
      }

      // Filter to only include PAST bookings (meetings that already happened)
      const currentTime = new Date();
      console.log("[Cal.com] Current time:", currentTime.toISOString());
      console.log("[Cal.com] Total bookings received from API:", bookings.length);

      bookings = bookings.filter((booking) => {
        const endTime = new Date(booking.endTime || booking.end);
        const isPast = endTime < currentTime;

        console.log(
          `[Cal.com] Booking: "${booking.title}" | End: ${endTime.toISOString()} | Current: ${currentTime.toISOString()} | Is Past: ${isPast}`
        );

        return isPast;
      });

      console.log(`[Cal.com] Filtered to ${bookings.length} past bookings`);

      // Update cache
      bookingsCache = bookings;
      cacheTimestamp = now;

      return bookings;
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return [];
    }
  }

  function extractEventInfo(container: Element) {
    try {
      // Extract event title - try multiple selectors
      let title = "";

      // Try various selectors for title
      const titleSelectors = [
        '[role="heading"]',
        "[data-title]",
        ".event-title",
        "h2",
        "h3",
        '[aria-label*="Event"]',
      ];

      for (const selector of titleSelectors) {
        const el = container.querySelector(selector);
        if (el?.textContent?.trim()) {
          title = el.textContent.trim();
          break;
        }
      }

      // If still no title, try getting from any heading-like element
      if (!title) {
        const allText = container.textContent || "";
        // Take first line as potential title
        title = allText.split("\n")[0]?.trim() || "";
      }

      console.log("[Cal.com] Extracted title:", title);

      // Extract event time - Google Calendar's time format is complex
      let startTime = null;
      let endTime = null;

      // Try data attributes
      const timeElements = container.querySelectorAll("[data-start-time], [data-end-time]");
      if (timeElements.length >= 2) {
        startTime = timeElements[0].getAttribute("data-start-time");
        endTime = timeElements[1].getAttribute("data-end-time");
      }

      // Try to find time in text
      if (!startTime) {
        const timePatterns = [/(\d{1,2}:\d{2}\s*[AP]M)/gi, /(\d{1,2}[AP]M)/gi];

        const containerText = container.textContent || "";
        for (const pattern of timePatterns) {
          const matches = containerText.match(pattern);
          if (matches && matches.length >= 1) {
            // Found time references
            console.log("[Cal.com] Found time matches:", matches);
            break;
          }
        }
      }

      console.log("[Cal.com] Extracted times:", { startTime, endTime });

      return {
        title,
        startTime,
        endTime,
      };
    } catch (error) {
      console.error("[Cal.com] Error extracting event info:", error);
      return null;
    }
  }

  function findMatchingBooking(eventInfo: any, bookings: any[]) {
    console.log("[Cal.com] Matching event title:", eventInfo.title);
    console.log(
      "[Cal.com] Available bookings:",
      bookings.map((b) => ({
        title: b.title,
        uid: b.uid,
        attendees: b.attendees?.length || 0,
      }))
    );

    // Match bookings by title and time
    for (const booking of bookings) {
      // Check if titles are similar (case-insensitive contains)
      const eventTitle = eventInfo.title.toLowerCase();
      const bookingTitle = (booking.title || "").toLowerCase();

      // Try exact match first
      if (eventTitle === bookingTitle) {
        console.log("[Cal.com] Exact match found:", booking.title);
        return booking;
      }

      // Try contains match
      if (eventTitle.includes(bookingTitle) || bookingTitle.includes(eventTitle)) {
        console.log("[Cal.com] Partial match found:", booking.title);
        // TODO: Also validate time matching
        return booking;
      }

      // Try matching against attendee names
      if (booking.attendees) {
        for (const attendee of booking.attendees) {
          const attendeeName = (attendee.name || "").toLowerCase();
          if (attendeeName && eventTitle.includes(attendeeName)) {
            console.log("[Cal.com] Match found via attendee name:", attendeeName);
            return booking;
          }
        }
      }
    }

    console.log("[Cal.com] No matching booking found");
    return null;
  }

  function findAttendeeElements(container: Element): Element[] {
    // Google Calendar shows attendees in various ways
    // Look for elements with email addresses
    const attendeeElements: Element[] = [];
    const foundEmails = new Set<string>();

    console.log("[Cal.com] Searching for attendees in container");

    // Common selectors for attendee lists
    const possibleSelectors = [
      "[data-email]",
      '[role="list"] [role="listitem"]',
      ".ep", // Common class prefix for event participants
      "[data-attendee]",
      ".attendee",
      '[aria-label*="attendee"]',
      '[aria-label*="guest"]',
    ];

    possibleSelectors.forEach((selector) => {
      const elements = container.querySelectorAll(selector);
      console.log(`[Cal.com] Found ${elements.length} elements for selector: ${selector}`);

      elements.forEach((el) => {
        // Check if this element contains an email
        const email = extractAttendeeEmail(el);
        if (email && !foundEmails.has(email)) {
          console.log("[Cal.com] Found attendee element with email:", email);
          attendeeElements.push(el);
          foundEmails.add(email);
        }
      });
    });

    // If no attendees found via selectors, search for emails in text
    if (attendeeElements.length === 0) {
      console.log("[Cal.com] No attendees found via selectors, searching text content");

      const allElements = container.querySelectorAll("div, span, p");
      allElements.forEach((el) => {
        const text = el.textContent || "";
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch && !foundEmails.has(emailMatch[0])) {
          // Check that this element is not nested inside one we already found
          let isNested = false;
          for (const existing of attendeeElements) {
            if (existing.contains(el)) {
              isNested = true;
              break;
            }
          }

          if (!isNested) {
            console.log("[Cal.com] Found attendee via text search:", emailMatch[0]);
            attendeeElements.push(el);
            foundEmails.add(emailMatch[0]);
          }
        }
      });
    }

    console.log("[Cal.com] Total attendee elements found:", attendeeElements.length);
    return attendeeElements;
  }

  function extractAttendeeEmail(element: Element): string | null {
    // Try data attribute first
    const dataEmail = element.getAttribute("data-email");
    if (dataEmail) {
      console.log("[Cal.com] Found email via data-email:", dataEmail);
      return dataEmail;
    }

    // Try aria-label
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      const emailMatch = ariaLabel.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        console.log("[Cal.com] Found email via aria-label:", emailMatch[0]);
        return emailMatch[0];
      }
    }

    // Try to find email in text content
    const text = element.textContent || "";
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      console.log("[Cal.com] Found email via text content:", emailMatch[0]);
      return emailMatch[0];
    }

    // Try to find in child elements
    const emailElements = element.querySelectorAll('[href^="mailto:"]');
    if (emailElements.length > 0) {
      const mailtoHref = emailElements[0].getAttribute("href");
      if (mailtoHref) {
        const email = mailtoHref.replace("mailto:", "");
        console.log("[Cal.com] Found email via mailto:", email);
        return email;
      }
    }

    return null;
  }

  function injectNoShowButton(
    attendeeEl: Element,
    attendee: any,
    booking: any,
    isPastBooking: boolean
  ) {
    console.log("[Cal.com] Injecting button for:", attendee.email, "in element:", attendeeEl);

    // Check if button already exists
    if (attendeeEl.querySelector(".cal-no-show-button")) {
      console.log("[Cal.com] Button already exists for:", attendee.email);
      return;
    }

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "cal-no-show-button";
    buttonContainer.style.cssText = `
      display: inline-flex !important;
      margin-left: 8px;
      vertical-align: middle;
      align-items: center;
    `;

    // Create button with Cal.com branding
    const button = document.createElement("button");
    const isNoShow = attendee.noShow || false;

    button.textContent = isNoShow ? "No Show" : "Mark No Show";

    // Disable button for upcoming bookings
    if (!isPastBooking) {
      button.disabled = true;
    }

    button.style.cssText = `
      padding: 4px 12px !important;
      border-radius: 4px !important;
      border: 1px solid ${isNoShow ? "#dc2626" : isPastBooking ? "#3b82f6" : "#9ca3af"} !important;
      background-color: ${isNoShow ? "#dc2626" : isPastBooking ? "#3b82f6" : "#e5e7eb"} !important;
      color: ${isPastBooking ? "#ffffff" : "#6b7280"} !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      font-family: 'Google Sans', Roboto, Arial, sans-serif !important;
      cursor: ${isPastBooking ? "pointer" : "not-allowed"} !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05) !important;
      white-space: nowrap !important;
      opacity: ${isPastBooking ? "1" : "0.6"} !important;
    `;

    console.log("[Cal.com] Button created with text:", button.textContent);

    // Create custom tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "cal-gcal-tooltip";
    tooltip.style.cssText = `
      position: fixed;
      background-color: #1a1a1a;
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 10002;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      display: none;
      font-family: 'Google Sans', Roboto, Arial, sans-serif !important;
    `;
    tooltip.textContent = isPastBooking
      ? "Cal.com - Mark attendee as no-show"
      : "Only available for past bookings";
    document.body.appendChild(tooltip);

    // Position and show/hide tooltip on hover
    const updateTooltipPosition = () => {
      const rect = button.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top - 8}px`;
      tooltip.style.transform = "translate(-50%, -100%)";
    };

    // Add hover effect with tooltip
    button.addEventListener("mouseenter", () => {
      if (isPastBooking) {
        if (isNoShow) {
          button.style.backgroundColor = "#b91c1c";
        } else {
          button.style.backgroundColor = "#2563eb";
        }
      }
      // Show tooltip
      updateTooltipPosition();
      tooltip.style.display = "block";
      setTimeout(() => {
        tooltip.style.opacity = "1";
      }, 50);
    });

    button.addEventListener("mouseleave", () => {
      if (isPastBooking) {
        if (isNoShow) {
          button.style.backgroundColor = "#dc2626";
        } else {
          button.style.backgroundColor = "#3b82f6";
        }
      }
      // Hide tooltip
      tooltip.style.opacity = "0";
      setTimeout(() => {
        if (tooltip.style.opacity === "0") {
          tooltip.style.display = "none";
        }
      }, 150);
    });

    // Add click handler
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't allow clicking for upcoming bookings
      if (!isPastBooking) {
        return;
      }

      const newNoShowState = !isNoShow;

      try {
        // Disable button while processing
        button.disabled = true;
        button.textContent = "Processing...";

        // Send message to background script to mark no-show
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              action: "mark-no-show",
              bookingUid: booking.uid,
              attendeeEmail: attendee.email,
              noShow: newNoShowState,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (response && response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            }
          );
        });

        // Update UI
        attendee.noShow = newNoShowState;
        button.textContent = newNoShowState ? "No Show" : "Mark No Show";
        button.style.backgroundColor = newNoShowState ? "#dc2626" : "#3b82f6";
        button.style.borderColor = newNoShowState ? "#dc2626" : "#3b82f6";

        // Apply strikethrough to attendee name
        if (newNoShowState) {
          const nameElement = attendeeEl.querySelector("span") || attendeeEl;
          if (nameElement instanceof HTMLElement) {
            nameElement.style.textDecoration = "line-through";
          }
        } else {
          const nameElement = attendeeEl.querySelector("span") || attendeeEl;
          if (nameElement instanceof HTMLElement) {
            nameElement.style.textDecoration = "none";
          }
        }

        // Clear cache to force refresh on next check
        bookingsCache = null;

        showNotification(
          newNoShowState
            ? `${attendee.name || attendee.email} marked as no-show`
            : `${attendee.name || attendee.email} unmarked as no-show`,
          "success"
        );
      } catch (error) {
        console.error("Error marking no-show:", error);
        showNotification("Failed to update no-show status", "error");
        // Restore button state
        button.textContent = isNoShow ? "No Show" : "Mark No Show";
      } finally {
        button.disabled = false;
      }
    });

    buttonContainer.appendChild(button);

    // Apply strikethrough if already marked
    if (isNoShow) {
      const nameElement = attendeeEl.querySelector("span") || attendeeEl;
      if (nameElement instanceof HTMLElement) {
        nameElement.style.textDecoration = "line-through";
      }
    }

    // Insert button after attendee name
    attendeeEl.appendChild(buttonContainer);
  }

  function injectButtonsInAttendeeSection(
    container: Element,
    booking: any,
    isPastBooking: boolean
  ) {
    console.log("[Cal.com] Searching for attendee section in popup...");

    // Don't create duplicate buttons
    if (container.querySelector(".cal-no-show-button")) {
      console.log("[Cal.com] Buttons already injected");
      return;
    }

    // Search for all text nodes and elements that contain email addresses
    // These are likely attendee listings
    const allElements = container.querySelectorAll("*");
    const attendeeElementsMap = new Map<string, Element>();

    allElements.forEach((el) => {
      const text = el.textContent || "";
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);

      if (emailMatch && emailMatch[0]) {
        const email = emailMatch[0];
        // Only consider if this is a relatively small element (not the whole container)
        if (text.length < 200 && !attendeeElementsMap.has(email)) {
          // Find the most specific parent that contains just this attendee
          let attendeeContainer = el;
          while (attendeeContainer.parentElement) {
            const parentText = attendeeContainer.parentElement.textContent || "";
            // If parent has multiple emails or is too large, stop here
            const parentEmails = parentText.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
            if (parentEmails.length > 1 || parentText.length > 300) {
              break;
            }
            attendeeContainer = attendeeContainer.parentElement;
          }
          attendeeElementsMap.set(email, attendeeContainer);
          console.log("[Cal.com] Found attendee element for:", email);
        }
      }
    });

    if (attendeeElementsMap.size === 0) {
      console.log("[Cal.com] Could not find attendee elements in popup");
      return;
    }

    // Now inject buttons for each attendee we found
    console.log(`[Cal.com] Injecting buttons for ${attendeeElementsMap.size} attendees`);

    if (booking.attendees && booking.attendees.length > 0) {
      booking.attendees.forEach((attendee: any) => {
        const attendeeElement =
          attendeeElementsMap.get(attendee.email.toLowerCase()) ||
          attendeeElementsMap.get(attendee.email);

        if (!attendeeElement) {
          console.log("[Cal.com] No element found for attendee:", attendee.email);
          return;
        }

        // Create button container
        const buttonContainer = document.createElement("div");
        buttonContainer.className = "cal-no-show-button";
        buttonContainer.style.cssText = `
          display: inline-flex !important;
          margin-left: 8px;
          vertical-align: middle;
          align-items: center;
        `;

        // Create button with Cal.com branding
        const isNoShow = attendee.noShow || false;
        const button = document.createElement("button");
        button.textContent = isNoShow ? "No Show" : "Mark No Show";

        // Disable button for upcoming bookings
        if (!isPastBooking) {
          button.disabled = true;
        }

        button.style.cssText = `
          padding: 4px 12px !important;
          border-radius: 4px !important;
          border: 1px solid ${isNoShow ? "#dc2626" : isPastBooking ? "#3b82f6" : "#9ca3af"} !important;
          background-color: ${isNoShow ? "#dc2626" : isPastBooking ? "#3b82f6" : "#e5e7eb"} !important;
          color: ${isPastBooking ? "#ffffff" : "#6b7280"} !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          font-family: 'Google Sans', Roboto, Arial, sans-serif !important;
          cursor: ${isPastBooking ? "pointer" : "not-allowed"} !important;
          transition: all 0.2s ease !important;
          white-space: nowrap !important;
          box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05) !important;
          opacity: ${isPastBooking ? "1" : "0.6"} !important;
        `;

        // Create custom tooltip
        const tooltip = document.createElement("div");
        tooltip.className = "cal-gcal-tooltip";
        tooltip.style.cssText = `
          position: fixed;
          background-color: #1a1a1a;
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 10002;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          display: none;
          font-family: 'Google Sans', Roboto, Arial, sans-serif !important;
        `;
        tooltip.textContent = isPastBooking
          ? "Cal.com - Mark attendee as no-show"
          : "Only available for past bookings";
        document.body.appendChild(tooltip);

        // Position and show/hide tooltip on hover
        const updateTooltipPosition = () => {
          const rect = button.getBoundingClientRect();
          tooltip.style.left = `${rect.left + rect.width / 2}px`;
          tooltip.style.top = `${rect.top - 8}px`;
          tooltip.style.transform = "translate(-50%, -100%)";
        };

        // Add hover effect with tooltip
        button.addEventListener("mouseenter", () => {
          if (isPastBooking) {
            if (isNoShow) {
              button.style.backgroundColor = "#b91c1c";
            } else {
              button.style.backgroundColor = "#2563eb";
            }
          }
          // Show tooltip
          updateTooltipPosition();
          tooltip.style.display = "block";
          setTimeout(() => {
            tooltip.style.opacity = "1";
          }, 50);
        });

        button.addEventListener("mouseleave", () => {
          if (isPastBooking) {
            if (isNoShow) {
              button.style.backgroundColor = "#dc2626";
            } else {
              button.style.backgroundColor = "#3b82f6";
            }
          }
          // Hide tooltip
          tooltip.style.opacity = "0";
          setTimeout(() => {
            if (tooltip.style.opacity === "0") {
              tooltip.style.display = "none";
            }
          }, 150);
        });

        // Add click handler
        button.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Don't allow clicking for upcoming bookings
          if (!isPastBooking) {
            return;
          }

          const newNoShowState = !attendee.noShow;

          try {
            button.disabled = true;
            button.textContent = "Processing...";

            const response = await new Promise((resolve, reject) => {
              chrome.runtime.sendMessage(
                {
                  action: "mark-no-show",
                  bookingUid: booking.uid,
                  attendeeEmail: attendee.email,
                  noShow: newNoShowState,
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else if (response && response.error) {
                    reject(new Error(response.error));
                  } else {
                    resolve(response);
                  }
                }
              );
            });

            // Update UI
            attendee.noShow = newNoShowState;
            button.textContent = newNoShowState ? "No Show" : "Mark No Show";
            button.style.backgroundColor = newNoShowState ? "#dc2626" : "#3b82f6";
            button.style.borderColor = newNoShowState ? "#dc2626" : "#3b82f6";

            // Apply strikethrough to attendee text in the popup
            const textElements = attendeeElement.querySelectorAll("*");
            textElements.forEach((el) => {
              if (el instanceof HTMLElement && el.textContent?.includes(attendee.email)) {
                el.style.textDecoration = newNoShowState ? "line-through" : "none";
              }
            });

            // Clear cache to force refresh
            bookingsCache = null;

            showNotification(
              newNoShowState
                ? `${attendee.name || attendee.email} marked as no-show`
                : `${attendee.name || attendee.email} unmarked as no-show`,
              "success"
            );
          } catch (error) {
            console.error("[Cal.com] Error marking no-show:", error);
            showNotification("Failed to update no-show status", "error");
            button.textContent = attendee.noShow ? "No Show" : "Mark No Show";
          } finally {
            button.disabled = false;
          }
        });

        // Apply strikethrough if already marked
        if (isNoShow) {
          const textElements = attendeeElement.querySelectorAll("*");
          textElements.forEach((el) => {
            if (el instanceof HTMLElement && el.textContent?.includes(attendee.email)) {
              el.style.textDecoration = "line-through";
            }
          });
        }

        buttonContainer.appendChild(button);

        // Insert button into the attendee element
        // Try to append at the end of the attendee container
        if (attendeeElement instanceof HTMLElement) {
          attendeeElement.style.display = "flex";
          attendeeElement.style.alignItems = "center";
          attendeeElement.style.justifyContent = "space-between";
          attendeeElement.appendChild(buttonContainer);
        }
      });
    }

    console.log("[Cal.com] Buttons injected into attendee section");
  }

  function showNotification(message: string, type: "success" | "error") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 80px;
      padding: 10px 12px;
      background: ${type === "success" ? "#111827" : "#752522"};
      color: white;
      border: 1px solid #2b2b2b;
      border-radius: 8px;
      font-family: 'Google Sans', Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
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
      }, 200);
    }, 3000);
  }

  // Initial injection attempt
  setTimeout(injectNoShowButtons, 1000);

  // Watch for DOM changes (Google Calendar is a SPA)
  const observer = new MutationObserver(() => {
    injectNoShowButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also check when URL changes (Google Calendar navigation)
  let currentUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      // Clear processed events when navigating
      processedEvents.clear();
      setTimeout(injectNoShowButtons, 500);
    }
  }, 1000);
}
