import type { FrameContext, EmbedLocation } from "./types";

export function getExecutionContext(): FrameContext {
  const isInIframe = window !== window.top;
  const frameId = isInIframe ? getFrameId() : "main";
  const contextLabel = isInIframe ? `iframe-${frameId}` : "webpage";

  return {
    isIframe: isInIframe,
    frameId,
    label: contextLabel,
    window: window,
    document: document,
    origin: window.location.origin || "about:blank",
  };
}

function getFrameId(): string {
  try {
    if (window.parent && window.parent !== window) {
      const parentFrames = window.parent.frames;
      for (let i = 0; i < parentFrames.length; i++) {
        try {
          if (parentFrames[i] === window) {
            return String(i);
          }
        } catch (e) {
          // Cross-origin, can't access
        }
      }
    }
  } catch (e) {
    // Unable to determine frame index
  }
  return "unknown";
}

function getIframeSelector(iframe: HTMLIFrameElement): string {
  // Build a useful selector for the iframe
  const parts: string[] = [];

  // Add tag name
  parts.push("iframe");

  // Add ID if present
  if (iframe.id) {
    parts.push(`#${iframe.id}`);
  }

  // Add name if present
  if (iframe.name) {
    parts.push(`[name="${iframe.name}"]`);
  }

  // Add classes if present
  if (iframe.className) {
    const classes = iframe.className.split(" ").filter((c) => c);
    classes.forEach((cls) => parts.push(`.${cls}`));
  }

  // If no identifying attributes, add src or index
  if (parts.length === 1) {
    if (iframe.src) {
      // Extract domain or path from src
      try {
        const url = new URL(iframe.src);
        if (url.hostname.includes("cal.com")) {
          parts.push('[src*="cal.com"]');
        } else {
          parts.push(`[src*="${url.hostname}"]`);
        }
      } catch {
        // Fallback to partial src
        const srcPart = iframe.src.slice(0, 50);
        parts.push(`[src^="${srcPart}"]`);
      }
    } else {
      // Use index as last resort
      const allIframes = document.querySelectorAll("iframe");
      const index = Array.from(allIframes).indexOf(iframe);
      parts.push(`:nth-of-type(${index + 1})`);
    }
  }

  return parts.join("");
}

export function detectEmbedLocations(): EmbedLocation[] {
  const locations: EmbedLocation[] = [];

  // Check main window
  if (typeof window.Cal !== "undefined") {
    locations.push({
      context: getExecutionContext(),
      hasEmbed: true,
      embedLoaded: window.Cal.loaded || false,
      embedVersion: window.Cal.version,
      origin: window.location.origin || "about:blank",
    });
  } else {
    locations.push({
      context: {
        isIframe: false,
        frameId: "main",
        label: "webpage",
        window: window,
        document: document,
        origin: window.location.origin || "about:blank",
      },
      hasEmbed: false,
      embedLoaded: false,
      origin: window.location.origin || "about:blank",
    });
  }

  // Check all iframes
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe, index) => {
    // Generate a selector for this iframe
    const selector = getIframeSelector(iframe);

    try {
      // Try to access iframe content (will fail for cross-origin)
      const iframeWindow = iframe.contentWindow;
      const iframeDoc = iframe.contentDocument;

      if (iframeWindow && iframeDoc) {
        // Check if Cal is defined in this iframe
        const hasCal = typeof (iframeWindow as any).Cal !== "undefined";
        const calObj = (iframeWindow as any).Cal;

        locations.push({
          context: {
            isIframe: true,
            frameId: String(index),
            label: `iframe-${index}`,
            window: iframeWindow,
            document: iframeDoc,
            origin: iframe.src || "about:blank",
            selector: selector,
          },
          hasEmbed: hasCal,
          embedLoaded: (hasCal && calObj?.loaded) || false,
          embedVersion: hasCal && calObj?.version,
          origin: iframe.src || "about:blank",
        });
      }
    } catch (e) {
      // Cross-origin iframe or access denied
      locations.push({
        context: {
          isIframe: true,
          frameId: String(index),
          label: `iframe-${index}`,
          window: null,
          document: null,
          origin: iframe.src || "cross-origin",
          selector: selector,
        },
        hasEmbed: false,
        embedLoaded: false,
        origin: iframe.src || "cross-origin",
        isCrossOrigin: true,
      });
    }
  });

  return locations;
}

export function findPrimaryEmbedLocation(locations: EmbedLocation[]): EmbedLocation | null {
  // First priority: loaded embed
  const loadedEmbed = locations.find((loc) => loc.hasEmbed && loc.embedLoaded);
  if (loadedEmbed) return loadedEmbed;

  // Second priority: any embed (even if not loaded)
  const anyEmbed = locations.find((loc) => loc.hasEmbed);
  if (anyEmbed) return anyEmbed;

  // No embed found
  return null;
}

export function getContextualLabel(context: FrameContext | undefined): string {
  if (!context) return "";
  return `[${context.label}]`;
}

export function isAccessibleFrame(location: EmbedLocation): boolean {
  return !location.isCrossOrigin && location.context.window !== null;
}

export function getAllAccessibleContexts(): FrameContext[] {
  const contexts: FrameContext[] = [];
  const locations = detectEmbedLocations();

  locations.forEach((location) => {
    if (isAccessibleFrame(location) && location.context.window) {
      contexts.push(location.context);
    }
  });

  return contexts;
}

export function getNetworkEntriesForContext(context: FrameContext): PerformanceResourceTiming[] {
  if (!context.window) return [];

  try {
    // Access the performance object from the specific context window
    const contextWindow = context.window as any;
    const perf = contextWindow.performance;

    if (perf && typeof perf.getEntriesByType === "function") {
      const entries = perf.getEntriesByType("resource");
      // Return all entries from this context (we'll filter for Cal.com URLs later)
      return entries as PerformanceResourceTiming[];
    }
  } catch (e) {
    console.warn(`Unable to access performance API in context ${context.label}:`, e);
  }

  return [];
}

export function getConsoleErrorsForContext(_context: FrameContext): any[] {
  // This would need to be set up per context
  // For now, return empty array - will be enhanced when updating interceptors
  return [];
}
