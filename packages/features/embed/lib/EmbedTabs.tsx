import type { MutableRefObject } from "react";
import { forwardRef } from "react";

import type { BookerLayout } from "@calcom/features/bookings/Booker/types";
import { APP_NAME } from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TextArea } from "@calcom/ui";

import type { EmbedFramework, EmbedType, PreviewState } from "../types";
import { Codes } from "./EmbedCodes";
import { buildCssVarsPerTheme } from "./buildCssVarsPerTheme";
import { embedLibUrl, EMBED_PREVIEW_HTML_URL } from "./constants";
import { getApiNameForReactSnippet, getApiNameForVanillaJsSnippet } from "./getApiName";
import { getDimension } from "./getDimension";
import { useEmbedCalOrigin } from "./hooks";

export const tabs = [
  {
    name: "HTML",
    href: "embedTabName=embed-code",
    icon: "code" as const,
    type: "code",
    Component: forwardRef<
      HTMLTextAreaElement | HTMLIFrameElement | null,
      { embedType: EmbedType; calLink: string; previewState: PreviewState; namespace: string }
    >(function EmbedHtml({ embedType, calLink, previewState, namespace }, ref) {
      const { t } = useLocale();
      const embedSnippetString = useGetEmbedSnippetString(namespace);
      const embedCalOrigin = useEmbedCalOrigin();
      if (ref instanceof Function || !ref) {
        return null;
      }
      if (ref.current && !(ref.current instanceof HTMLTextAreaElement)) {
        return null;
      }
      return (
        <>
          <div>
            <small className="text-subtle flex py-2">
              {t("place_where_cal_widget_appear", { appName: APP_NAME })}
            </small>
          </div>
          <TextArea
            data-testid="embed-code"
            ref={ref as typeof ref & MutableRefObject<HTMLTextAreaElement>}
            name="embed-code"
            className="text-default bg-default h-[calc(100%-50px)] font-mono"
            style={{ resize: "none", overflow: "auto" }}
            readOnly
            value={`<!-- Cal ${embedType} embed code begins -->\n${
              embedType === "inline"
                ? `<div style="width:${getDimension(previewState.inline.width)};height:${getDimension(
                    previewState.inline.height
                  )};overflow:scroll" id="my-cal-inline"></div>\n`
                : ""
            }<script type="text/javascript">
  ${embedSnippetString}
  ${getEmbedTypeSpecificString({
    embedFramework: "HTML",
    embedType,
    calLink,
    previewState,
    embedCalOrigin,
    namespace,
  })}
  </script>
  <!-- Cal ${embedType} embed code ends -->`}
          />
          <p className="text-subtle hidden text-sm">{t("need_help_embedding")}</p>
        </>
      );
    }),
  },
  {
    name: "React",
    href: "embedTabName=embed-react",
    icon: "code" as const,
    type: "code",
    Component: forwardRef<
      HTMLTextAreaElement | HTMLIFrameElement | null,
      { embedType: EmbedType; calLink: string; previewState: PreviewState; namespace: string }
    >(function EmbedReact({ embedType, calLink, previewState, namespace }, ref) {
      const { t } = useLocale();
      const embedCalOrigin = useEmbedCalOrigin();

      if (ref instanceof Function || !ref) {
        return null;
      }
      if (ref.current && !(ref.current instanceof HTMLTextAreaElement)) {
        return null;
      }
      return (
        <>
          <small className="text-subtle flex py-2">{t("create_update_react_component")}</small>
          <TextArea
            data-testid="embed-react"
            ref={ref as typeof ref & MutableRefObject<HTMLTextAreaElement>}
            name="embed-react"
            className="text-default bg-default h-[calc(100%-50px)] font-mono"
            readOnly
            style={{ resize: "none", overflow: "auto" }}
            value={`/* First make sure that you have installed the package */

  /* If you are using yarn */
  // yarn add @calcom/embed-react

  /* If you are using npm */
  // npm install @calcom/embed-react
  ${getEmbedTypeSpecificString({
    embedFramework: "react",
    embedType,
    calLink,
    previewState,
    embedCalOrigin,
    namespace,
  })}
  `}
          />
        </>
      );
    }),
  },
  {
    name: "Preview",
    href: "embedTabName=embed-preview",
    icon: "trello" as const,
    type: "iframe",
    Component: forwardRef<
      HTMLIFrameElement | HTMLTextAreaElement | null,
      { calLink: string; embedType: EmbedType; previewState: PreviewState; namespace: string }
    >(function Preview({ calLink, embedType }, ref) {
      const bookerUrl = useBookerUrl();
      const iframeSrc = `${EMBED_PREVIEW_HTML_URL}?embedType=${embedType}&calLink=${calLink}&embedLibUrl=${embedLibUrl}&bookerUrl=${bookerUrl}`;
      if (ref instanceof Function || !ref) {
        return null;
      }
      if (ref.current && !(ref.current instanceof HTMLIFrameElement)) {
        return null;
      }
      return (
        <iframe
          ref={ref as typeof ref & MutableRefObject<HTMLIFrameElement>}
          data-testid="embed-preview"
          className="rounded-md border"
          width="100%"
          height="100%"
          src={iframeSrc}
          key={iframeSrc}
        />
      );
    }),
  },
];

const getEmbedTypeSpecificString = ({
  embedFramework,
  embedType,
  calLink,
  embedCalOrigin,
  previewState,
  namespace,
}: {
  embedFramework: EmbedFramework;
  embedType: EmbedType;
  calLink: string;
  previewState: PreviewState;
  embedCalOrigin: string;
  namespace: string;
}) => {
  const frameworkCodes = Codes[embedFramework];
  if (!frameworkCodes) {
    throw new Error(`No code available for the framework:${embedFramework}`);
  }
  if (embedType === "email") return "";
  let uiInstructionStringArg: {
    apiName: string;
    theme: PreviewState["theme"];
    brandColor: string | null;
    darkBrandColor: string | null;
    hideEventTypeDetails: boolean;
    layout?: BookerLayout;
  };
  const baseUiInstructionStringArg = {
    theme: previewState.theme,
    brandColor: previewState.palette.brandColor,
    darkBrandColor: previewState.palette.darkBrandColor,
    hideEventTypeDetails: previewState.hideEventTypeDetails,
    layout: previewState.layout,
  };
  if (embedFramework === "react") {
    uiInstructionStringArg = {
      ...baseUiInstructionStringArg,
      apiName: getApiNameForReactSnippet({ mainApiName: "cal" }),
    };
  } else {
    uiInstructionStringArg = {
      ...baseUiInstructionStringArg,
      apiName: getApiNameForVanillaJsSnippet({ namespace, mainApiName: "Cal" }),
    };
  }
  if (!frameworkCodes[embedType]) {
    throw new Error(`Code not available for framework:${embedFramework} and embedType:${embedType}`);
  }

  const codeGeneratorInput = {
    calLink,
    uiInstructionCode: getEmbedUIInstructionString(uiInstructionStringArg),
    embedCalOrigin,
    namespace,
  };

  if (embedType === "inline") {
    return frameworkCodes[embedType]({
      ...codeGeneratorInput,
      previewState: previewState.inline,
    });
  } else if (embedType === "floating-popup") {
    return frameworkCodes[embedType]({
      ...codeGeneratorInput,
      previewState: previewState.floatingPopup,
    });
  } else if (embedType === "element-click") {
    return frameworkCodes[embedType]({
      ...codeGeneratorInput,
      previewState: previewState.elementClick,
    });
  }
  return "";
};

const getEmbedUIInstructionString = ({
  apiName,
  theme,
  brandColor,
  darkBrandColor,
  hideEventTypeDetails,
  layout,
}: {
  apiName: string;
  theme?: string;
  brandColor: string | null;
  darkBrandColor: string | null;
  hideEventTypeDetails: boolean;
  layout?: string;
}) => {
  theme = theme !== "auto" ? theme : undefined;

  return getInstructionString({
    apiName,
    instructionName: "ui",
    instructionArg: {
      theme,
      cssVarsPerTheme: buildCssVarsPerTheme({ brandColor, darkBrandColor }),
      hideEventTypeDetails,
      layout,
    },
  });
};

const getInstructionString = ({
  apiName,
  instructionName,
  instructionArg,
}: {
  apiName: string;
  instructionName: string;
  instructionArg: Record<string, unknown>;
}) => {
  return `${apiName}("${instructionName}", ${JSON.stringify(instructionArg)});`;
};

function useGetEmbedSnippetString(namespace: string | null) {
  const bookerUrl = useBookerUrl();
  // TODO: Import this string from @calcom/embed-snippet
  // Right now the problem is that embed-snippet export is not minified and has comments which makes it unsuitable for giving it to users.
  // If we can minify that during build time and then import the built code here, that could work
  return `(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "${embedLibUrl}", "init");
Cal("init", ${namespace ? `"${namespace}",` : ""} {origin:"${bookerUrl}"});
`;
}
