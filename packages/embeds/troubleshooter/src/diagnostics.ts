import type { DiagnosticSection, ConsoleError, NetworkLogEntry } from "./types";
import { getCalOrigin, isCalcomUrl, getBaseCalDomain } from "./utils";

export async function checkEmbedInstallation(): Promise<DiagnosticSection> {
  const results: DiagnosticSection = {
    title: "Embed Installation",
    status: "info",
    checks: [],
  };

  if (typeof window.Cal !== "undefined") {
    results.checks.push({
      icon: "✓",
      status: "success",
      text: "window.Cal is defined",
      details: `Type: ${typeof window.Cal}`,
    });

    if (typeof window.Cal === "function") {
      results.checks.push({
        icon: "✓",
        status: "success",
        text: "Cal is a callable function",
        details: "Can handle Cal() API calls",
      });
    } else {
      results.checks.push({
        icon: "⚠",
        status: "warning",
        text: "Cal is not a function",
        details: "May cause errors when clicking data-cal-link elements",
      });
    }

    if (window.Cal.loaded) {
      results.checks.push({
        icon: "✓",
        status: "success",
        text: "Embed is fully loaded",
        details: null,
      });
    } else {
      results.checks.push({
        icon: "⚠",
        status: "warning",
        text: "Embed is defined but not loaded",
        details: "The embed script may still be loading",
      });
    }

    if (window.Cal.ns && Object.keys(window.Cal.ns).length > 0) {
      results.checks.push({
        icon: "✓",
        status: "success",
        text: `Namespaces: ${Object.keys(window.Cal.ns).join(", ")}`,
        details: null,
      });
    }

    if (window.Cal.version || window.Cal.fingerprint) {
      results.checks.push({
        icon: "ℹ",
        status: "info",
        text: "Version info available",
        details: `Version: ${window.Cal.version || "N/A"}, Fingerprint: ${window.Cal.fingerprint || "N/A"}`,
      });
    }

    // Show detected origin
    results.checks.push({
      icon: "ℹ",
      status: "info",
      text: "Detected Cal.com origin",
      details: getCalOrigin(),
    });

    results.status = window.Cal.loaded ? "success" : "warning";
  } else {
    results.checks.push({
      icon: "✗",
      status: "error",
      text: "window.Cal is not defined",
      details: "The Cal.com embed snippet has not been loaded",
    });
    results.status = "error";
  }

  return results;
}

export async function checkNetworkRequests(): Promise<DiagnosticSection> {
  const results: DiagnosticSection = {
    title: "Network & Scripts",
    status: "info",
    checks: [],
  };

  const scripts = Array.from(document.scripts);
  const embedScript = scripts.find(
    (script) => script.src && (script.src.includes("/embed.js") || script.src.includes("embed-core"))
  );

  if (embedScript) {
    results.checks.push({
      icon: "✓",
      status: "success",
      text: "embed.js script found",
      details: `Source: ${embedScript.src}`,
    });

    if (embedScript.readyState === "complete" || !embedScript.readyState) {
      results.checks.push({
        icon: "✓",
        status: "success",
        text: "Script loaded successfully",
        details: null,
      });
    }

    results.status = "success";
  } else {
    results.checks.push({
      icon: "⚠",
      status: "warning",
      text: "embed.js script not found in DOM",
      details: "Script may be loaded dynamically or not yet loaded",
    });
    results.status = "warning";
  }

  // Find all iframes and check if they're from Cal.com
  const allIframes = document.querySelectorAll("iframe");
  const calIframes: HTMLIFrameElement[] = [];

  allIframes.forEach((iframe) => {
    if (iframe.src && isCalcomUrl(iframe.src)) {
      calIframes.push(iframe);
    } else if (iframe.name && iframe.name.startsWith("cal-embed")) {
      calIframes.push(iframe);
    }
  });

  if (calIframes.length > 0) {
    results.checks.push({
      icon: "✓",
      status: "success",
      text: `Found ${calIframes.length} Cal.com iframe(s)`,
      details: calIframes
        .map((iframe) => {
          const src = iframe.src || "No src";
          const name = iframe.name || "No name";
          return `${name}: ${src}`;
        })
        .join(", "),
    });
  }

  return results;
}

export function checkEmbedElements(): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Embed Elements",
    status: "info",
    checks: [],
  };

  const elements = {
    "cal-inline": "Inline Embed",
    "cal-modal-box": "Modal Embed",
    "cal-floating-button": "Floating Button",
    "[data-cal-link]": "Pop-up via element click",
    "[data-cal-namespace]": "Namespaced Elements",
  };

  let foundAny = false;

  Object.entries(elements).forEach(([selector, name]) => {
    const found = document.querySelectorAll(selector);
    if (found.length > 0) {
      foundAny = true;
      const details = getElementDetails(found, selector);
      results.checks.push({
        icon: "✓",
        status: "success",
        text: `${name}: ${found.length} found`,
        details: details,
      });

      found.forEach((el) => {
        if (
          el.getAttribute("state") === "failed" ||
          el.getAttribute("loading") === "failed" ||
          el.getAttribute("data-error-code")
        ) {
          results.checks.push({
            icon: "✗",
            status: "error",
            text: `Error on ${el.tagName.toLowerCase()}`,
            details: `Error code: ${el.getAttribute("data-error-code") || "unknown"}`,
          });
          results.status = "error";
        }
      });
    }
  });

  if (!foundAny) {
    results.checks.push({
      icon: "ℹ",
      status: "info",
      text: "No embed elements found on page",
      details: "This is normal if embeds are created dynamically",
    });
  } else if (results.status !== "error") {
    results.status = "success";
  }

  return results;
}

export function checkErrors(consoleErrors: ConsoleError[], networkLog: NetworkLogEntry[]): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Error Detection",
    status: "success",
    checks: [],
  };

  const errorElements = document.querySelectorAll('[data-error-code], [state="failed"], [loading="failed"]');

  if (errorElements.length > 0) {
    results.status = "error";
    errorElements.forEach((el) => {
      const errorCode = el.getAttribute("data-error-code");
      const state = el.getAttribute("state") || el.getAttribute("loading");
      results.checks.push({
        icon: "✗",
        status: "error",
        text: `Error on ${el.tagName.toLowerCase()}`,
        details: `Code: ${errorCode || "N/A"}, State: ${state}`,
      });
    });
  }

  if (consoleErrors.length > 0) {
    results.status = "error";
    results.checks.push({
      icon: "✗",
      status: "error",
      text: `${consoleErrors.length} console error(s) detected`,
      details: "Check the Console tab for details",
    });
  }

  const failedRequests = networkLog.filter((req) => req.error || (req.status && req.status >= 400));
  if (failedRequests.length > 0) {
    results.status = "error";
    results.checks.push({
      icon: "✗",
      status: "error",
      text: `${failedRequests.length} failed network request(s)`,
      details: "Check the Network tab for details",
    });
  }

  if (results.checks.length === 0) {
    results.checks.push({
      icon: "✓",
      status: "success",
      text: "No errors detected",
      details: null,
    });
  }

  return results;
}

export function checkConfiguration(): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Configuration",
    status: "info",
    checks: [],
  };

  if (window.Cal) {
    if (window.Cal.__config) {
      results.checks.push({
        icon: "ℹ",
        status: "info",
        text: "Global configuration",
        details: `Origin: ${window.Cal.__config.calOrigin || "default"}`,
      });
    }

    const elements = document.querySelectorAll("[data-cal-config]");
    elements.forEach((el) => {
      const calConfig = el.getAttribute("data-cal-config");
      if (calConfig) {
        try {
          JSON.parse(calConfig);
          results.checks.push({
            icon: "✓",
            status: "success",
            text: "Valid config on element",
            details: `Element: ${el.tagName.toLowerCase()}`,
          });
        } catch (e) {
          results.checks.push({
            icon: "✗",
            status: "error",
            text: "Invalid JSON in data-cal-config",
            details: `Element: ${el.tagName.toLowerCase()}`,
          });
          results.status = "error";
        }
      }
    });

    if (window.Cal.config) {
      results.checks.push({
        icon: "ℹ",
        status: "info",
        text: "Forward query params",
        details: window.Cal.config.forwardQueryParams ? "Enabled" : "Disabled",
      });
    }
  }

  return results;
}

export function checkSecurityPolicies(): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Security & Policies",
    status: "info",
    checks: [],
  };

  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (cspMeta) {
    const csp = cspMeta.getAttribute("content");
    const baseDomain = getBaseCalDomain();
    if (csp && !csp.includes(baseDomain)) {
      results.checks.push({
        icon: "⚠",
        status: "warning",
        text: "CSP may block Cal.com resources",
        details: `Consider adding ${baseDomain} to your Content Security Policy`,
      });
      results.status = "warning";
    } else {
      results.checks.push({
        icon: "✓",
        status: "success",
        text: "CSP allows Cal.com",
        details: null,
      });
    }
  }

  // Check if any Cal.com iframes are rendering (using our flexible detection)
  const allIframes = document.querySelectorAll("iframe");
  const renderingCalIframes = Array.from(allIframes).filter(
    (iframe) => iframe.src && isCalcomUrl(iframe.src)
  );

  if (renderingCalIframes.length > 0) {
    results.checks.push({
      icon: "✓",
      status: "success",
      text: "Cal.com iframes are rendering",
      details: "X-Frame-Options is not blocking embeds",
    });
  }

  return results;
}

export function generateRecommendations(): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Recommendations",
    status: "info",
    checks: [],
  };

  if (typeof window.Cal === "undefined") {
    results.checks.push({
      icon: "💡",
      status: "info",
      text: "Install the embed snippet",
      details: "Add the Cal.com embed snippet to your page before using embeds",
    });
  }

  const embeds = document.querySelectorAll("cal-inline, cal-modal-box");
  if (embeds.length > 3) {
    results.checks.push({
      icon: "💡",
      status: "info",
      text: "Consider using namespaces",
      details: `You have ${embeds.length} embeds. Namespaces can help organize multiple embeds`,
    });
  }

  if (window.Cal && !window.Cal.__config?.calOrigin) {
    results.checks.push({
      icon: "💡",
      status: "info",
      text: "Consider setting a custom origin",
      details: "Useful for self-hosted Cal.com instances",
    });
  }

  return results;
}

function getElementDetails(elements: NodeListOf<Element>, selector: string): string | null {
  if (elements.length === 1) {
    const el = elements[0] as HTMLElement;
    const details = [];
    if (el.id) details.push(`ID: ${el.id}`);
    if (el.dataset.calLink) details.push(`Link: ${el.dataset.calLink}`);
    if (el.dataset.calNamespace) details.push(`NS: ${el.dataset.calNamespace}`);
    if (el.dataset.calConfig) details.push("Has config");
    return details.join(", ") || null;
  }

  // For multiple elements, show their selectors
  const elementSelectors: string[] = [];
  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    let elSelector = htmlEl.tagName.toLowerCase();

    if (htmlEl.id) {
      elSelector += `#${htmlEl.id}`;
    } else if (htmlEl.className) {
      elSelector += `.${htmlEl.className
        .split(" ")
        .filter((c) => c)
        .join(".")}`;
    }

    // Add data-cal-link value if it's a popup element
    if (selector === "[data-cal-link]" && htmlEl.dataset.calLink) {
      elSelector += ` (${htmlEl.dataset.calLink})`;
    }

    elementSelectors.push(elSelector);
  });

  return elementSelectors.join(", ");
}
