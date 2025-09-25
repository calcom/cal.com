// packages/calid/modules/event-types/components/tabs/hooks/useEmbedCode.ts
import { useCallback, useMemo } from "react";

import { useEmbedBookerUrl } from "@calcom/lib/hooks/useBookerUrl";

import { buildCssVarsPerTheme } from "../lib/buildCssVarsPerTheme";
import { embedLibUrl } from "../lib/constants";
import type { EmbedSettings } from "./useEmbedSettings";

interface UseEmbedCodeProps {
  embedType: string;
  embedUrl: string;
  embedSettings: EmbedSettings;
  namespace: string;
  eventType?: any;
}

export const useEmbedCode = ({
  embedType,
  embedUrl,
  embedSettings,
  namespace,
  eventType,
}: UseEmbedCodeProps) => {
  const bookerUrl = useEmbedBookerUrl();

  // Generate embed snippet string
  const embedSnippetString = useMemo(() => {
    return `(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "${embedLibUrl}", "init");
Cal("init", ${namespace ? `"${namespace}",` : ""} {origin:"${bookerUrl}"});`;
  }, [namespace, bookerUrl]);

  const generateHtmlCode = useCallback(() => {
    const cssVars = buildCssVarsPerTheme({
      brandColor: `#${embedSettings.lightBrandColor}`,
      darkBrandColor: `#${embedSettings.darkBrandColor}`,
    });

    switch (embedType) {
      case "inline":
        return `<!-- Cal inline embed code begins -->
<div style="width:${embedSettings.windowWidth}%;height:${
          embedSettings.windowHeight
        }%;overflow:scroll" id="my-cal-inline-${namespace}"></div>
<script type="text/javascript">
  ${embedSnippetString}
  Cal("inline", {
    elementOrSelector: "#my-cal-inline-${namespace}",
    calLink: "${embedUrl}",
    layout: "${embedSettings.layout}",
    config: {
      theme: "${embedSettings.theme}",
      ${embedSettings.hideEventTypeDetails ? "hideEventTypeDetails: true," : ""}
    }
  });
  Cal("ui", ${JSON.stringify({
    theme: embedSettings.theme,
    cssVarsPerTheme: cssVars,
    hideEventTypeDetails: embedSettings.hideEventTypeDetails,
    layout: embedSettings.layout,
  })});
</script>
<!-- Cal inline embed code ends -->`;

      case "floating-popup":
        return `<!-- Cal floating-popup embed code begins -->
<script type="text/javascript">
  ${embedSnippetString}
  Cal("floatingButton", {
    calLink: "${embedUrl}",
    buttonText: "${embedSettings.buttonText}",
    buttonColor: "#${embedSettings.buttonColor}",
    buttonTextColor: "#${embedSettings.textColor}",
    buttonPosition: "${embedSettings.position}",
    hideButtonIcon: ${!embedSettings.displayCalendarIcon},
    config: {
      theme: "${embedSettings.theme}",
      layout: "${embedSettings.layout}",
      ${embedSettings.hideEventTypeDetails ? "hideEventTypeDetails: true," : ""}
    }
  });
  Cal("ui", ${JSON.stringify({
    theme: embedSettings.theme,
    cssVarsPerTheme: cssVars,
    hideEventTypeDetails: embedSettings.hideEventTypeDetails,
    layout: embedSettings.layout,
  })});
</script>
<!-- Cal floating-popup embed code ends -->`;

      case "element-click":
        return `<!-- Cal element-click embed code begins -->
<button data-cal-link="${embedUrl}" data-cal-config='${JSON.stringify({
          theme: embedSettings.theme,
          layout: embedSettings.layout,
          hideEventTypeDetails: embedSettings.hideEventTypeDetails,
        })}'>
  ${embedSettings.buttonText}
</button>
<script type="text/javascript">
  ${embedSnippetString}
  Cal("ui", ${JSON.stringify({
    theme: embedSettings.theme,
    cssVarsPerTheme: cssVars,
    hideEventTypeDetails: embedSettings.hideEventTypeDetails,
    layout: embedSettings.layout,
  })});
</script>
<!-- Cal element-click embed code ends -->`;

      case "email":
        // MANUAL: Implement email-specific HTML generation based on your requirements
        return `<a href="${bookerUrl}/${embedUrl}?theme=${embedSettings.theme}" 
   style="display: inline-block; 
          padding: 12px 24px; 
          background-color: #${embedSettings.buttonColor}; 
          color: #${embedSettings.textColor}; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: 500;">
  ${embedSettings.buttonText}
</a>`;

      default:
        return "";
    }
  }, [embedType, embedUrl, embedSettings, embedSnippetString, bookerUrl, namespace]);

  const generateReactCode = useCallback(() => {
    const cssVars = buildCssVarsPerTheme({
      brandColor: `#${embedSettings.lightBrandColor}`,
      darkBrandColor: `#${embedSettings.darkBrandColor}`,
    });

    switch (embedType) {
      case "inline":
        return `import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function MyApp() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi();
      cal("ui", {
        theme: "${embedSettings.theme}",
        cssVarsPerTheme: ${JSON.stringify(cssVars)},
        hideEventTypeDetails: ${embedSettings.hideEventTypeDetails},
        layout: "${embedSettings.layout}"
      });
    })();
  }, [])

  return <Cal
    namespace="${namespace}"
    calLink="${embedUrl}"
    style={{width:"${embedSettings.windowWidth}%",height:"${embedSettings.windowHeight}%",overflow:"scroll"}}
    config={{
      theme: "${embedSettings.theme}",
      layout: "${embedSettings.layout}",
      hideEventTypeDetails: ${embedSettings.hideEventTypeDetails}
    }}
  />;
};`;

      case "floating-popup":
        return `import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function MyApp() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi("${namespace}");
      cal("floatingButton", {
        calLink: "${embedUrl}",
        buttonText: "${embedSettings.buttonText}",
        buttonColor: "#${embedSettings.buttonColor}",
        buttonTextColor: "#${embedSettings.textColor}",
        buttonPosition: "${embedSettings.position}",
        hideButtonIcon: ${!embedSettings.displayCalendarIcon},
        config: {
          theme: "${embedSettings.theme}",
          layout: "${embedSettings.layout}",
          hideEventTypeDetails: ${embedSettings.hideEventTypeDetails}
        }
      });
      cal("ui", {
        theme: "${embedSettings.theme}",
        cssVarsPerTheme: ${JSON.stringify(cssVars)},
        hideEventTypeDetails: ${embedSettings.hideEventTypeDetails},
        layout: "${embedSettings.layout}"
      });
    })();
  }, [])

  return null;
};`;

      case "element-click":
        return `import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function MyApp() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi("${namespace}");
      cal("ui", {
        theme: "${embedSettings.theme}",
        cssVarsPerTheme: ${JSON.stringify(cssVars)},
        hideEventTypeDetails: ${embedSettings.hideEventTypeDetails},
        layout: "${embedSettings.layout}"
      });
    })();
  }, [])

  return <button 
    data-cal-namespace="${namespace}"
    data-cal-link="${embedUrl}"
    data-cal-config='${JSON.stringify({
      theme: embedSettings.theme,
      layout: embedSettings.layout,
      hideEventTypeDetails: embedSettings.hideEventTypeDetails,
    })}'
  >
    ${embedSettings.buttonText}
  </button>;
};`;

      case "email":
        return `// For email embeds, use the HTML version as React components aren't supported in emails`;

      default:
        return "";
    }
  }, [embedType, embedUrl, embedSettings, namespace]);

  const generateCode = useCallback(
    (type: "html" | "react") => {
      return type === "html" ? generateHtmlCode() : generateReactCode();
    },
    [generateHtmlCode, generateReactCode]
  );

  const copyCode = useCallback(
    (type: "html" | "react") => {
      const code = generateCode(type);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
        return true;
      }
      return false;
    },
    [generateCode]
  );

  return {
    generateCode,
    copyCode,
  };
};
