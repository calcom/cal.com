import type { DiagnosticSection, ConsoleError, NetworkLogEntry, DiagnosticResults, GroupedDiagnosticResults, EmbedLocation } from "./types";
import { getCalOrigin, isCalcomUrl, getBaseCalDomain } from "./utils";
import { detectEmbedLocations, findPrimaryEmbedLocation, getContextualLabel } from "./context-utils";

export async function checkEmbedInstallation(): Promise<DiagnosticSection> {
  const results: DiagnosticSection = {
    title: "Embed Installation",
    status: "info",
    checks: [],
  };

  // Detect all embed locations (main window and iframes)
  const embedLocations = detectEmbedLocations();
  const primaryLocation = findPrimaryEmbedLocation(embedLocations);
  
  // If we found embeds in iframes, note it
  const iframeEmbeds = embedLocations.filter(loc => loc.context.isIframe && loc.hasEmbed);
  const mainEmbed = embedLocations.find(loc => !loc.context.isIframe && loc.hasEmbed);
  
  if (iframeEmbeds.length > 0 && !mainEmbed) {
    results.checks.push({
      icon: "[i]",
      status: "info",
      text: `Embed detected in iframe${iframeEmbeds.length > 1 ? 's' : ''}`,
      details: iframeEmbeds.map(e => e.context.label).join(", "),
    });
  }

  // Check primary embed location (could be main window or iframe)
  if (primaryLocation && primaryLocation.hasEmbed) {
    const contextLabel = getContextualLabel(primaryLocation.context);
    const cal = primaryLocation.context.window ? (primaryLocation.context.window as any).Cal : window.Cal;
    
    results.checks.push({
      icon: "[OK]",
      status: "success",
      text: `window.Cal is defined ${contextLabel}`,
      details: `Type: ${typeof cal}`,
    });

    if (typeof cal === "function") {
      results.checks.push({
        icon: "[OK]",
        status: "success",
        text: `Cal is a callable function ${contextLabel}`,
        details: "Can handle Cal() API calls",
      });
    } else {
      results.checks.push({
        icon: "!",
        status: "warning",
        text: `Cal is not a function ${contextLabel}`,
        details: "May cause errors when clicking data-cal-link elements",
      });
    }

    if (cal?.loaded) {
      results.checks.push({
        icon: "[OK]",
        status: "success",
        text: `Embed is fully loaded ${contextLabel}`,
        details: null,
      });
    } else {
      results.checks.push({
        icon: "!",
        status: "warning",
        text: `Embed is defined but not loaded ${contextLabel}`,
        details: "The embed script may still be loading",
      });
    }

    if (cal?.ns && Object.keys(cal.ns).length > 0) {
      results.checks.push({
        icon: "[OK]",
        status: "success",
        text: `Namespaces ${contextLabel}: ${Object.keys(cal.ns).join(", ")}`,
        details: null,
      });
    }

    if (cal?.version || cal?.fingerprint) {
      results.checks.push({
        icon: "[i]",
        status: "info",
        text: `Version info available ${contextLabel}`,
        details: `Version: ${cal?.version || "N/A"}, Fingerprint: ${cal?.fingerprint || "N/A"}`,
      });
    }

    // Show detected origin
    results.checks.push({
      icon: "[i]",
      status: "info",
      text: `Detected Cal.com origin ${contextLabel}`,
      details: getCalOrigin(),
    });

    results.status = cal?.loaded ? "success" : "warning";
  } else {
    // No embed found anywhere
    results.checks.push({
      icon: "[X]",
      status: "error",
      text: "window.Cal is not defined in any context",
      details: "The Cal.com embed snippet has not been loaded in the webpage or any accessible iframe",
    });
    
    // Check if there are iframes we couldn't access
    const crossOriginFrames = embedLocations.filter(loc => loc.isCrossOrigin);
    if (crossOriginFrames.length > 0) {
      results.checks.push({
        icon: "!",
        status: "warning",
        text: `${crossOriginFrames.length} cross-origin iframe(s) detected`,
        details: "Cannot check for embeds in cross-origin iframes due to security restrictions",
      });
    }
    
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

  // Check all accessible contexts for embed scripts
  const embedLocations = detectEmbedLocations();
  let foundEmbedScript = false;
  
  embedLocations.forEach((location) => {
    if (!location.isCrossOrigin && location.context.document) {
      const contextLabel = getContextualLabel(location.context);
      const scripts = Array.from(location.context.document.scripts);
      const embedScript = scripts.find(
        (script) => script.src && (script.src.includes("/embed.js") || script.src.includes("embed-core"))
      );

      if (embedScript) {
        foundEmbedScript = true;
        results.checks.push({
          icon: "[OK]",
          status: "success",
          text: `embed.js script found ${contextLabel}`,
          details: `Source: ${embedScript.src}`,
        });

        if (embedScript.readyState === "complete" || !embedScript.readyState) {
          results.checks.push({
            icon: "[OK]",
            status: "success",
            text: `Script loaded successfully ${contextLabel}`,
            details: null,
          });
        }
      }
    }
  });

  if (!foundEmbedScript) {
    results.checks.push({
      icon: "!",
      status: "warning",
      text: "embed.js script not found in any accessible context",
      details: "Script may be loaded dynamically or not yet loaded",
    });
    results.status = "warning";
  } else {
    results.status = "success";
  }

  // Find all iframes across all contexts
  const allCalIframes: Array<{iframe: HTMLIFrameElement; context: string}> = [];
  
  embedLocations.forEach((location) => {
    if (!location.isCrossOrigin && location.context.document) {
      const contextLabel = location.context.label;
      const iframes = location.context.document.querySelectorAll("iframe");
      
      iframes.forEach((iframe) => {
        if ((iframe.src && isCalcomUrl(iframe.src)) || 
            (iframe.name && iframe.name.startsWith("cal-embed"))) {
          allCalIframes.push({ iframe, context: contextLabel });
        }
      });
    }
  });

  if (allCalIframes.length > 0) {
    results.checks.push({
      icon: "[OK]",
      status: "success",
      text: `Found ${allCalIframes.length} Cal.com iframe(s)`,
      details: allCalIframes
        .map(({ iframe, context }) => {
          const src = iframe.src || "No src";
          const name = iframe.name || "No name";
          return `[${context}] ${name}: ${src}`;
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
  const embedLocations = detectEmbedLocations();

  // Check all accessible contexts for embed elements
  embedLocations.forEach((location) => {
    if (!location.isCrossOrigin && location.context.document) {
      const contextLabel = getContextualLabel(location.context);
      
      Object.entries(elements).forEach(([selector, name]) => {
        const found = location.context.document!.querySelectorAll(selector);
        if (found.length > 0) {
          foundAny = true;
          const details = getElementDetails(found, selector);
          results.checks.push({
            icon: "[OK]",
            status: "success",
            text: `${name} ${contextLabel}: ${found.length} found`,
            details: details,
          });

          found.forEach((el) => {
            if (
              el.getAttribute("state") === "failed" ||
              el.getAttribute("loading") === "failed" ||
              el.getAttribute("data-error-code")
            ) {
              results.checks.push({
                icon: "[X]",
                status: "error",
                text: `Error on ${el.tagName.toLowerCase()} ${contextLabel}`,
                details: `Error code: ${el.getAttribute("data-error-code") || "unknown"}`,
              });
              results.status = "error";
            }
          });
        }
      });
    }
  });

  if (!foundAny) {
    results.checks.push({
      icon: "[i]",
      status: "info",
      text: "No embed elements found in any accessible context",
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
        icon: "[X]",
        status: "error",
        text: `Error on ${el.tagName.toLowerCase()}`,
        details: `Code: ${errorCode || "N/A"}, State: ${state}`,
      });
    });
  }

  if (consoleErrors.length > 0) {
    results.status = "error";
    results.checks.push({
      icon: "[X]",
      status: "error",
      text: `${consoleErrors.length} console error(s) detected`,
      details: "Check the Console tab for details",
    });
  }

  const failedRequests = networkLog.filter((req) => req.error || (req.status && req.status >= 400));
  if (failedRequests.length > 0) {
    results.status = "error";
    results.checks.push({
      icon: "[X]",
      status: "error",
      text: `${failedRequests.length} failed network request(s)`,
      details: "Check the Network tab for details",
    });
  }

  if (results.checks.length === 0) {
    results.checks.push({
      icon: "[OK]",
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
        icon: "[i]",
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
            icon: "[OK]",
            status: "success",
            text: "Valid config on element",
            details: `Element: ${el.tagName.toLowerCase()}`,
          });
        } catch (e) {
          results.checks.push({
            icon: "[X]",
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
        icon: "[i]",
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
        icon: "!",
        status: "warning",
        text: "CSP may block Cal.com resources",
        details: `Consider adding ${baseDomain} to your Content Security Policy`,
      });
      results.status = "warning";
    } else {
      results.checks.push({
        icon: "[OK]",
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
      icon: "[OK]",
      status: "success",
      text: "Cal.com iframes are rendering",
      details: "X-Frame-Options is not blocking embeds",
    });
  }

  return results;
}

export function checkIframeVisibility(): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "CSS & Visibility",
    status: "info",
    checks: [],
  };

  const embedLocations = detectEmbedLocations();
  const allCalIframes: Array<{iframe: HTMLIFrameElement; context: string}> = [];
  const allEmbedElements: Array<{element: Element; context: string}> = [];
  
  // Find all Cal.com iframes and embed elements across all contexts
  embedLocations.forEach((location) => {
    if (!location.isCrossOrigin && location.context.document) {
      const contextLabel = location.context.label;
      
      // Find iframes in this context
      const iframes = location.context.document.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        if (
          (iframe.src && isCalcomUrl(iframe.src)) ||
          (iframe.name && iframe.name.startsWith("cal-embed")) ||
          iframe.classList.contains("cal-embed")
        ) {
          allCalIframes.push({ iframe, context: contextLabel });
        }
      });
      
      // Find embed elements in this context
      const embedElements = location.context.document.querySelectorAll("cal-inline, cal-modal-box, .cal-embed");
      embedElements.forEach((element) => {
        allEmbedElements.push({ element, context: contextLabel });
      });
    }
  });
  
  if (allCalIframes.length === 0 && allEmbedElements.length === 0) {
    results.checks.push({
      icon: "[i]",
      status: "info",
      text: "No Cal.com iframes or embed elements found in any accessible context",
      details: "Embeds may not be initialized yet",
    });
    return results;
  }

  // Check each iframe for visibility issues
  allCalIframes.forEach(({ iframe, context }, index) => {
    const computedStyle = window.getComputedStyle(iframe);
    const parentComputedStyle = iframe.parentElement ? window.getComputedStyle(iframe.parentElement) : null;
    const issues: string[] = [];
    
    // Check for display: none
    if (computedStyle.display === "none") {
      issues.push("display: none");
    }
    
    // Check for visibility: hidden
    if (computedStyle.visibility === "hidden") {
      issues.push("visibility: hidden");
    }
    
    // Check for zero dimensions
    const width = parseFloat(computedStyle.width);
    const height = parseFloat(computedStyle.height);
    
    if (width === 0) {
      issues.push("width: 0");
    }
    
    if (height === 0) {
      issues.push("height: 0");
    }
    
    // Check for opacity: 0
    if (parseFloat(computedStyle.opacity) === 0) {
      issues.push("opacity: 0");
    }
    
    // Check for extreme positioning
    const position = computedStyle.position;
    if (position === "absolute" || position === "fixed") {
      const left = parseFloat(computedStyle.left);
      const top = parseFloat(computedStyle.top);
      
      if (left < -1000 || top < -1000) {
        issues.push(`positioned off-screen (left: ${left}px, top: ${top}px)`);
      }
    }
    
    // Check parent element for issues
    if (parentComputedStyle) {
      if (parentComputedStyle.display === "none") {
        issues.push("parent has display: none");
      }
      if (parentComputedStyle.visibility === "hidden") {
        issues.push("parent has visibility: hidden");
      }
      if (parseFloat(parentComputedStyle.width) === 0) {
        issues.push("parent has width: 0");
      }
      if (parseFloat(parentComputedStyle.height) === 0) {
        issues.push("parent has height: 0");
      }
    }
    
    // Check for CSS rules targeting .cal-embed
    const styleSheets = Array.from(document.styleSheets);
    const calEmbedRules: string[] = [];
    
    styleSheets.forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        rules.forEach((rule) => {
          if (rule instanceof CSSStyleRule) {
            if (rule.selectorText && rule.selectorText.includes(".cal-embed")) {
              const style = rule.style;
              const problematicProps: string[] = [];
              
              if (style.display === "none") problematicProps.push("display: none");
              if (style.visibility === "hidden") problematicProps.push("visibility: hidden");
              if (style.width === "0" || style.width === "0px") problematicProps.push("width: 0");
              if (style.height === "0" || style.height === "0px") problematicProps.push("height: 0");
              if (style.opacity === "0") problematicProps.push("opacity: 0");
              
              if (problematicProps.length > 0) {
                calEmbedRules.push(`${rule.selectorText} { ${problematicProps.join("; ")} }`);
              }
            }
          }
        });
      } catch (e) {
        // Ignore cross-origin stylesheet errors
      }
    });
    
    const iframeDesc = `[${context}] ${iframe.name || iframe.src || `Iframe #${index + 1}`}`;
    
    if (issues.length > 0) {
      results.checks.push({
        icon: "!",
        status: "warning",
        text: `Visibility issues on ${iframeDesc}`,
        details: issues.join(", "),
      });
      results.status = "warning";
    } else {
      results.checks.push({
        icon: "[OK]",
        status: "success",
        text: `No visibility issues on ${iframeDesc}`,
        details: `Dimensions: ${width}x${height}px`,
      });
    }
    
    if (calEmbedRules.length > 0) {
      results.checks.push({
        icon: "!",
        status: "warning",
        text: "Found CSS rules targeting .cal-embed",
        details: calEmbedRules.join("; "),
      });
      results.status = "warning";
    }
  });
  
  // Check embed elements separately
  allEmbedElements.forEach(({ element, context }) => {
    const computedStyle = window.getComputedStyle(element);
    const issues: string[] = [];
    
    if (computedStyle.display === "none") issues.push("display: none");
    if (computedStyle.visibility === "hidden") issues.push("visibility: hidden");
    if (parseFloat(computedStyle.width) === 0) issues.push("width: 0");
    if (parseFloat(computedStyle.height) === 0) issues.push("height: 0");
    
    if (issues.length > 0) {
      results.checks.push({
        icon: "!",
        status: "warning",
        text: `Visibility issues on [${context}] ${element.tagName.toLowerCase()}`,
        details: issues.join(", "),
      });
      results.status = "warning";
    }
  });
  
  if (results.status === "info" && results.checks.every(check => check.status === "success")) {
    results.status = "success";
  }
  
  return results;
}

export function generateRecommendations(location?: EmbedLocation): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Recommendations",
    status: "info",
    checks: [],
  };

  // Check if Cal.com is installed in the current context
  const calInContext = location ? location.hasEmbed : (typeof window.Cal !== "undefined");
  
  // If not in current context, check if it's installed anywhere
  if (!calInContext) {
    const embedLocations = detectEmbedLocations();
    const hasCalAnywhere = embedLocations.some(loc => loc.hasEmbed);
    
    if (!hasCalAnywhere) {
      results.checks.push({
        icon: "[TIP]",
        status: "info",
        text: "Install the embed snippet",
        details: "Add the Cal.com embed snippet to your page before using embeds",
      });
    }
  }

  // Check for embeds in the current context
  const contextDoc = location?.context.document || document;
  if (contextDoc) {
    const embeds = contextDoc.querySelectorAll("cal-inline, cal-modal-box");
    if (embeds.length > 3) {
      results.checks.push({
        icon: "[TIP]",
        status: "info",
        text: "Consider using namespaces",
        details: `You have ${embeds.length} embeds. Namespaces can help organize multiple embeds`,
      });
    }
  }

  // Check for custom origin configuration
  if (calInContext) {
    const cal = location?.context.window ? (location.context.window as any).Cal : window.Cal;
    if (cal && !cal.__config?.calOrigin) {
      results.checks.push({
        icon: "[TIP]",
        status: "info",
        text: "Consider setting a custom origin",
        details: "Useful for self-hosted Cal.com instances",
      });
    }
  }

  return results;
}

export function generateNotes(location?: EmbedLocation): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Notes",
    status: "info",
    checks: [],
  };

  // Check if this is an iframe context with Cal.com
  if (location && location.context.isIframe && location.hasEmbed) {
    results.checks.push({
      icon: "[!]",
      status: "warning",
      text: "Query params are not auto-forwarded in iframes",
      details: `<a href="https://cal.com/help/embedding/embed-auto-forward-query-params#framer-specific-issue" target="_blank" style="color: #3b82f6; text-decoration: underline;">Learn about query param forwarding →</a>`,
    });

    results.checks.push({
      icon: "[i]",
      status: "info",
      text: "Cross-origin restrictions apply",
      details: "Parent page cannot directly access iframe's Cal object due to browser security",
    });
    
    // Check if iframe name suggests a specific platform
    if (location.context.selector?.includes('framer')) {
      results.checks.push({
        icon: "[i]",
        status: "info",
        text: "Framer-specific considerations",
        details: `<a href="https://cal.com/docs/platform/workflows/how-to-embed-cal-in-framer" target="_blank" style="color: #3b82f6; text-decoration: underline;">View Framer embedding guide →</a>`,
      });
    }

    // Check if this is a same-origin iframe
    if (location.context.origin === window.location.origin) {
      results.checks.push({
        icon: "[TIP]",
        status: "info",
        text: "Consider direct embedding",
        details: "Since this is same-origin, you could embed Cal.com directly in the parent page for better integration",
      });
    }
  }

  // Check if Cal.com is in webpage but not in any iframe (opposite scenario)
  const embedLocations = detectEmbedLocations();
  const hasCalInWebpage = embedLocations.some(loc => !loc.context.isIframe && loc.hasEmbed);
  const hasIframes = embedLocations.some(loc => loc.context.isIframe);
  
  if (!location && hasCalInWebpage && hasIframes) {
    // This is webpage context with Cal.com, and there are iframes
    results.checks.push({
      icon: "[i]",
      status: "info",
      text: "Cal.com in parent won't affect iframes",
      details: "Each iframe needs its own Cal.com embed script",
    });
  }

  // If no notes found, don't show the section
  if (results.checks.length === 0) {
    return results;
  }

  return results;
}

export async function runGroupedDiagnostics(consoleErrors: ConsoleError[], networkLog: NetworkLogEntry[]): Promise<GroupedDiagnosticResults[]> {
  const embedLocations = detectEmbedLocations();
  const groups: GroupedDiagnosticResults[] = [];
  
  // Check if Cal.com is detected anywhere
  const hasCalAnywhere = embedLocations.some(loc => loc.hasEmbed);
  const hasCalInIframe = embedLocations.some(loc => loc.context.isIframe && loc.hasEmbed);
  const hasCalInWebpage = embedLocations.some(loc => !loc.context.isIframe && loc.hasEmbed);
  
  if (!hasCalAnywhere) {
    // No Cal.com detected anywhere - show single context with all diagnostics
    const diagnostics = await runDiagnosticsForAllContexts(consoleErrors, networkLog);
    groups.push({
      context: "webpage",
      diagnostics,
      isExpanded: true
    });
  } else if (hasCalInIframe) {
    // Cal.com found in at least one iframe - show grouped contexts
    // Show iframe contexts with Cal.com first (they are the important ones)
    for (const location of embedLocations) {
      if (location.context.isIframe && location.hasEmbed) {
        const diagnostics = await runDiagnosticsForContext(location, consoleErrors, networkLog);
        groups.push({
          context: location.context.label,
          diagnostics,
          isExpanded: true, // Expand iframe with Cal.com
          selector: location.context.selector
        });
      }
    }
    
    // Then show webpage context (even if Cal.com not detected there)
    const webpageLocation = embedLocations.find(loc => !loc.context.isIframe);
    if (webpageLocation) {
      const diagnostics = await runDiagnosticsForContext(webpageLocation, consoleErrors, networkLog);
      groups.push({
        context: "webpage",
        diagnostics,
        isExpanded: false // Collapse webpage when Cal.com is in iframe
      });
    }
  } else {
    // Cal.com only in webpage, not in iframes - show single context
    const webpageLocation = embedLocations.find(loc => !loc.context.isIframe);
    if (webpageLocation) {
      const diagnostics = await runDiagnosticsForContext(webpageLocation, consoleErrors, networkLog);
      groups.push({
        context: "webpage",
        diagnostics,
        isExpanded: true
      });
    }
  }
  
  return groups;
}

async function runDiagnosticsForContext(
  location: EmbedLocation, 
  consoleErrors: ConsoleError[], 
  networkLog: NetworkLogEntry[]
): Promise<DiagnosticResults> {
  const contextLabel = location.context.label;
  
  // Filter console errors and network logs for this context
  const contextConsoleErrors = consoleErrors.filter(e => e.context === contextLabel);
  const contextNetworkLog = networkLog.filter(e => e.context === contextLabel);
  
  const notes = generateNotes(location);
  
  return {
    embed: await checkEmbedInstallationForContext(location),
    network: await checkNetworkRequestsForContext(location),
    elements: checkEmbedElementsForContext(location),
    errors: checkErrors(contextConsoleErrors, contextNetworkLog),
    configuration: checkConfigurationForContext(location),
    security: checkSecurityPolicies(),
    visibility: checkIframeVisibilityForContext(location),
    recommendations: generateRecommendations(location),
    ...(notes.checks.length > 0 ? { notes } : {}),
  };
}

async function runDiagnosticsForAllContexts(
  consoleErrors: ConsoleError[], 
  networkLog: NetworkLogEntry[]
): Promise<DiagnosticResults> {
  const notes = generateNotes();
  
  return {
    embed: await checkEmbedInstallation(),
    network: await checkNetworkRequests(),
    elements: checkEmbedElements(),
    errors: checkErrors(consoleErrors, networkLog),
    configuration: checkConfiguration(),
    security: checkSecurityPolicies(),
    visibility: checkIframeVisibility(),
    recommendations: generateRecommendations(),
    ...(notes.checks.length > 0 ? { notes } : {}),
  };
}

async function checkEmbedInstallationForContext(location: EmbedLocation): Promise<DiagnosticSection> {
  const results: DiagnosticSection = {
    title: "Embed Installation",
    status: "info",
    checks: [],
  };

  if (location.hasEmbed) {
    const cal = location.context.window ? (location.context.window as any).Cal : null;
    
    results.checks.push({
      icon: "[OK]",
      status: "success",
      text: "window.Cal is defined",
      details: `Type: ${typeof cal}`,
    });

    if (typeof cal === "function") {
      results.checks.push({
        icon: "[OK]",
        status: "success",
        text: "Cal is a callable function",
        details: "Can handle Cal() API calls",
      });
    }

    if (cal?.loaded) {
      results.checks.push({
        icon: "[OK]",
        status: "success",
        text: "Embed is fully loaded",
        details: null,
      });
      results.status = "success";
    } else {
      results.checks.push({
        icon: "!",
        status: "warning",
        text: "Embed is defined but not loaded",
        details: "The embed script may still be loading",
      });
      results.status = "warning";
    }
  } else {
    // Check if this is webpage context and Cal.com exists in an iframe
    if (!location.context.isIframe) {
      const embedLocations = detectEmbedLocations();
      const hasCalInIframe = embedLocations.some(loc => loc.context.isIframe && loc.hasEmbed);
      
      if (hasCalInIframe) {
        // Cal.com is in iframe, not having it in webpage is expected
        results.checks.push({
          icon: "[i]",
          status: "info",
          text: "window.Cal is not defined in webpage",
          details: "This is expected - Cal.com is loaded in an iframe context",
        });
        results.status = "info";
      } else {
        // No Cal.com anywhere, this is an error
        results.checks.push({
          icon: "[X]",
          status: "error",
          text: "window.Cal is not defined",
          details: "The Cal.com embed snippet has not been loaded",
        });
        results.status = "error";
      }
    } else {
      // This is an iframe without Cal.com - error
      results.checks.push({
        icon: "[X]",
        status: "error",
        text: "window.Cal is not defined",
        details: "The Cal.com embed snippet has not been loaded in this iframe",
      });
      results.status = "error";
    }
  }

  return results;
}

async function checkNetworkRequestsForContext(location: EmbedLocation): Promise<DiagnosticSection> {
  const results: DiagnosticSection = {
    title: "Network & Scripts",
    status: "info",
    checks: [],
  };

  if (!location.isCrossOrigin && location.context.document) {
    const scripts = Array.from(location.context.document.scripts);
    const embedScript = scripts.find(
      (script) => script.src && (script.src.includes("/embed.js") || script.src.includes("embed-core"))
    );

    if (embedScript) {
      results.checks.push({
        icon: "[OK]",
        status: "success",
        text: "embed.js script found",
        details: `Source: ${embedScript.src}`,
      });
      results.status = "success";
    } else {
      // Check if this is webpage and Cal.com is in iframe
      if (!location.context.isIframe) {
        const embedLocations = detectEmbedLocations();
        const hasCalInIframe = embedLocations.some(loc => loc.context.isIframe && loc.hasEmbed);
        
        if (hasCalInIframe) {
          results.checks.push({
            icon: "[i]",
            status: "info",
            text: "embed.js script not in webpage",
            details: "Script is loaded within iframe context",
          });
          results.status = "info";
        } else {
          results.checks.push({
            icon: "!",
            status: "warning",
            text: "embed.js script not found",
            details: "Script may be loaded dynamically",
          });
          results.status = "warning";
        }
      } else {
        results.checks.push({
          icon: "!",
          status: "warning",
          text: "embed.js script not found",
          details: "Script may be loaded dynamically",
        });
        results.status = "warning";
      }
    }
  }

  return results;
}

function checkEmbedElementsForContext(location: EmbedLocation): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Embed Elements",
    status: "info",
    checks: [],
  };

  if (!location.isCrossOrigin && location.context.document) {
    const elements = {
      "cal-inline": "Inline Embed",
      "cal-modal-box": "Modal Embed",
      "cal-floating-button": "Floating Button",
      "[data-cal-link]": "Pop-up via element click",
    };

    let foundAny = false;
    Object.entries(elements).forEach(([selector, name]) => {
      const found = location.context.document!.querySelectorAll(selector);
      if (found.length > 0) {
        foundAny = true;
        results.checks.push({
          icon: "[OK]",
          status: "success",
          text: `${name}: ${found.length} found`,
          details: null,
        });
      }
    });

    if (!foundAny) {
      results.checks.push({
        icon: "[i]",
        status: "info",
        text: "No embed elements found",
        details: "This is normal if embeds are created dynamically",
      });
    } else {
      results.status = "success";
    }
  }

  return results;
}

function checkConfigurationForContext(location: EmbedLocation): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "Configuration",
    status: "info",
    checks: [],
  };

  if (location.hasEmbed && location.context.window) {
    const cal = (location.context.window as any).Cal;
    if (cal?.__config) {
      results.checks.push({
        icon: "[i]",
        status: "info",
        text: "Global configuration",
        details: `Origin: ${cal.__config.calOrigin || "default"}`,
      });
    }
  }

  return results;
}

function checkIframeVisibilityForContext(location: EmbedLocation): DiagnosticSection {
  const results: DiagnosticSection = {
    title: "CSS & Visibility",
    status: "info",
    checks: [],
  };

  if (!location.isCrossOrigin && location.context.document) {
    const iframes = location.context.document.querySelectorAll("iframe");
    const calIframes = Array.from(iframes).filter(
      (iframe) => (iframe.src && isCalcomUrl(iframe.src)) || 
                  (iframe.name && iframe.name.startsWith("cal-embed"))
    );

    if (calIframes.length > 0) {
      results.checks.push({
        icon: "[i]",
        status: "info",
        text: `${calIframes.length} Cal.com iframe(s) found`,
        details: null,
      });
      results.status = "success";
    }
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
