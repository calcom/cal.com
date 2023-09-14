import { forwardRef } from "react";
import type { MutableRefObject } from "react";

import type { BookerLayout } from "@calcom/features/bookings/Booker/types";
import { APP_NAME, IS_SELF_HOSTED } from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TextArea } from "@calcom/ui";
import { Code, Trello } from "@calcom/ui/components/icon";

import type { EmbedType, PreviewState, EmbedFramework } from "../types";
import { Codes } from "./EmbedCodes";
import { EMBED_PREVIEW_HTML_URL, embedLibUrl } from "./constants";
import { getDimension } from "./getDimension";
import { useEmbedCalOrigin } from "./hooks";

export const tabs = [
  {
    name: "HTML",
    href: "embedTabName=embed-code",
    icon: Code,
    type: "code",
    Component: forwardRef<
      HTMLTextAreaElement | HTMLIFrameElement | null,
      { embedType: EmbedType; calLink: string; previewState: PreviewState }
    >(function EmbedHtml({ embedType, calLink, previewState }, ref) {
      const { t } = useLocale();
      const embedSnippetString = useGetEmbedSnippetString();
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
            <small className="text-subtle flex py-4">
              {t("place_where_cal_widget_appear", { appName: APP_NAME })}
            </small>
          </div>
          <TextArea
            data-testid="embed-code"
            ref={ref as typeof ref & MutableRefObject<HTMLTextAreaElement>}
            name="embed-code"
            className="text-default bg-default selection:bg-subtle h-[calc(100%-50px)] font-mono"
            style={{ resize: "none", overflow: "auto" }}
            readOnly
            value={
              `<!-- Cal ${embedType} embed code begins -->\n` +
              (embedType === "inline"
                ? `<div style="width:${getDimension(previewState.inline.width)};height:${getDimension(
                    previewState.inline.height
                  )};overflow:scroll" id="my-cal-inline"></div>\n`
                : "") +
              `<script type="text/javascript">
  ${embedSnippetString}
  ${getEmbedTypeSpecificString({ embedFramework: "HTML", embedType, calLink, previewState, embedCalOrigin })}
  </script>
  <!-- Cal ${embedType} embed code ends -->`
            }
          />
          <p className="text-subtle hidden text-sm">{t("need_help_embedding")}</p>
        </>
      );
    }),
  },
  {
    name: "React",
    href: "embedTabName=embed-react",
    icon: Code,
    type: "code",
    Component: forwardRef<
      HTMLTextAreaElement | HTMLIFrameElement | null,
      { embedType: EmbedType; calLink: string; previewState: PreviewState }
    >(function EmbedReact({ embedType, calLink, previewState }, ref) {
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
          <small className="text-subtle flex py-4">{t("create_update_react_component")}</small>
          <TextArea
            data-testid="embed-react"
            ref={ref as typeof ref & MutableRefObject<HTMLTextAreaElement>}
            name="embed-react"
            className="text-default bg-default selection:bg-subtle h-[calc(100%-50px)] font-mono"
            readOnly
            style={{ resize: "none", overflow: "auto" }}
            value={`/* First make sure that you have installed the package */
  
  /* If you are using yarn */
  // yarn add @calcom/embed-react
  
  /* If you are using npm */
  // npm install @calcom/embed-react
  ${getEmbedTypeSpecificString({ embedFramework: "react", embedType, calLink, previewState, embedCalOrigin })}
  `}
          />
        </>
      );
    }),
  },
  {
    name: "Preview",
    href: "embedTabName=embed-preview",
    icon: Trello,
    type: "iframe",
    Component: forwardRef<
      HTMLIFrameElement | HTMLTextAreaElement | null,
      { calLink: string; embedType: EmbedType; previewState: PreviewState }
    >(function Preview({ calLink, embedType }, ref) {
      const bookerUrl = useBookerUrl();
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
          className="h-[100vh] border"
          width="100%"
          height="100%"
          src={`${EMBED_PREVIEW_HTML_URL}?embedType=${embedType}&calLink=${calLink}&embedLibUrl=${embedLibUrl}&bookerUrl=${bookerUrl}`}
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
}: {
  embedFramework: EmbedFramework;
  embedType: EmbedType;
  calLink: string;
  previewState: PreviewState;
  embedCalOrigin: string;
}) => {
  const frameworkCodes = Codes[embedFramework];
  if (!frameworkCodes) {
    throw new Error(`No code available for the framework:${embedFramework}`);
  }
  if (embedType === "email") return "";
  let uiInstructionStringArg: {
    apiName: string;
    theme: PreviewState["theme"];
    brandColor: string;
    hideEventTypeDetails: boolean;
    layout?: BookerLayout;
  };
  if (embedFramework === "react") {
    uiInstructionStringArg = {
      apiName: "cal",
      theme: previewState.theme,
      brandColor: previewState.palette.brandColor,
      hideEventTypeDetails: previewState.hideEventTypeDetails,
      layout: previewState.layout,
    };
  } else {
    uiInstructionStringArg = {
      apiName: "Cal",
      theme: previewState.theme,
      brandColor: previewState.palette.brandColor,
      hideEventTypeDetails: previewState.hideEventTypeDetails,
      layout: previewState.layout,
    };
  }
  if (!frameworkCodes[embedType]) {
    throw new Error(`Code not available for framework:${embedFramework} and embedType:${embedType}`);
  }
  if (embedType === "inline") {
    return frameworkCodes[embedType]({
      calLink,
      uiInstructionCode: getEmbedUIInstructionString(uiInstructionStringArg),
      previewState,
      embedCalOrigin,
    });
  } else if (embedType === "floating-popup") {
    const floatingButtonArg = {
      calLink,
      ...(IS_SELF_HOSTED ? { calOrigin: embedCalOrigin } : null),
      ...previewState.floatingPopup,
    };
    return frameworkCodes[embedType]({
      floatingButtonArg: JSON.stringify(floatingButtonArg),
      uiInstructionCode: getEmbedUIInstructionString(uiInstructionStringArg),
    });
  } else if (embedType === "element-click") {
    return frameworkCodes[embedType]({
      calLink,
      uiInstructionCode: getEmbedUIInstructionString(uiInstructionStringArg),
      previewState,
      embedCalOrigin,
    });
  }
  return "";
};

const getEmbedUIInstructionString = ({
  apiName,
  theme,
  brandColor,
  hideEventTypeDetails,
  layout,
}: {
  apiName: string;
  theme?: string;
  brandColor: string;
  hideEventTypeDetails: boolean;
  layout?: string;
}) => {
  theme = theme !== "auto" ? theme : undefined;
  return getInstructionString({
    apiName,
    instructionName: "ui",
    instructionArg: {
      theme,
      styles: {
        branding: {
          brandColor,
        },
      },
      hideEventTypeDetails: hideEventTypeDetails,
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

function useGetEmbedSnippetString() {
  const bookerUrl = useBookerUrl();
  // TODO: Import this string from @calcom/embed-snippet
  return `(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; typeof namespace === "string" ? (cal.ns[namespace] = api) && p(api, ar) : p(cal, ar); return; } p(cal, ar); }; })(window, "${embedLibUrl}", "init");
Cal("init", {origin:"${bookerUrl}"});
`;
}
