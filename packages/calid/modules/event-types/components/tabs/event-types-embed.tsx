import { Button } from "@calid/features/ui/components/button";
import { CustomSelect } from "@calid/features/ui/components/custom-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { Label } from "@calid/features/ui/components/label";
import { Switch } from "@calid/features/ui/components/switch/switch";
import { Collapsible, CollapsibleContent } from "@radix-ui/react-collapsible";
import { useSession } from "next-auth/react";
import React, { useState, useRef, forwardRef, useEffect, useCallback } from "react";

import {
  DEFAULT_LIGHT_BRAND_COLOR,
  DEFAULT_DARK_BRAND_COLOR,
  WEBAPP_URL,
  WEBSITE_URL,
  IS_SELF_HOSTED,
} from "@calcom/lib/constants";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { trpc } from "@calcom/trpc/react";
import { ColorPicker, TextField } from "@calcom/ui/components/form";

// Types (unchanged)
type EmbedType = "inline" | "floating-popup" | "element-click" | "email";
type EmbedTheme = "auto" | "light" | "dark";
type BookerLayout = "month_view" | "week_view" | "column_view";

interface EmbedConfig {
  theme?: EmbedTheme;
  layout?: BookerLayout;
  hideEventTypeDetails?: boolean;
  brandColor?: string;
  darkBrandColor?: string;
}

interface PreviewState {
  inline: {
    width: string;
    height: string;
    config: EmbedConfig;
  };
  theme: EmbedTheme;
  layout: BookerLayout;
  floatingPopup: {
    config: EmbedConfig;
    buttonText?: string;
    hideButtonIcon?: boolean;
    buttonPosition?: "bottom-right" | "bottom-left";
    buttonColor?: string;
    buttonTextColor?: string;
  };
  elementClick: {
    config: EmbedConfig;
  };
  hideEventTypeDetails: boolean;
  palette: {
    brandColor: string | null;
    darkBrandColor: string | null;
  };
}

// Constants and utility functions (unchanged)
const embedLibUrl = `${WEBAPP_URL}/embed-link/embed.js`;
const EMBED_PREVIEW_HTML_URL = `${WEBAPP_URL}/embed-link/preview.html`;

const getDimension = (dimension: string) => {
  if (
    dimension.endsWith("%") ||
    dimension.endsWith("px") ||
    dimension.endsWith("em") ||
    dimension.endsWith("rem")
  ) {
    return dimension;
  }
  return `${dimension}px`;
};

const doWeNeedCalOriginProp = (embedCalOrigin: string) => {
  return IS_SELF_HOSTED || (embedCalOrigin !== WEBAPP_URL && embedCalOrigin !== WEBSITE_URL);
};

const buildCssVarsPerTheme = ({
  brandColor,
  darkBrandColor,
}: {
  brandColor: string | null;
  darkBrandColor: string | null;
}) => {
  const lightModeVars = brandColor ? { "--cal-brand-color": brandColor } : {};
  const darkModeVars = darkBrandColor ? { "--cal-brand-color": darkBrandColor } : {};

  return {
    ...(Object.keys(lightModeVars).length ? { light: lightModeVars } : {}),
    ...(Object.keys(darkModeVars).length ? { dark: darkModeVars } : {}),
  };
};

// Code generation functions (unchanged)
const getEmbedSnippetString = (namespace: string | null, bookerUrl: string) => {
  return `(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); }; })(window, "${embedLibUrl}", "init");
Cal("init", ${namespace ? `"${namespace}",` : ""} {origin:"${bookerUrl}"});
`;
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

  return `${apiName}("ui", ${JSON.stringify({
    theme,
    cssVarsPerTheme: buildCssVarsPerTheme({ brandColor, darkBrandColor }),
    hideEventTypeDetails,
    layout,
  })});`;
};

const generateHTMLCode = (
  embedType: EmbedType,
  calLink: string,
  previewState: PreviewState,
  namespace: string,
  bookerUrl: string,
  embedCalOrigin: string
) => {
  const embedSnippet = getEmbedSnippetString(namespace, bookerUrl);
  const uiInstructionCode = getEmbedUIInstructionString({
    apiName: `Cal${namespace ? `.ns["${namespace}"]` : ""}`,
    theme: previewState.theme,
    brandColor: previewState.palette.brandColor,
    darkBrandColor: previewState.palette.darkBrandColor,
    hideEventTypeDetails: previewState.hideEventTypeDetails,
    layout: previewState.layout,
  });

  switch (embedType) {
    case "inline":
      return `<!-- Cal ${embedType} embed code begins -->
<div style="width:${getDimension(previewState.inline.width)};height:${getDimension(
        previewState.inline.height
      )};overflow:scroll" id="my-cal-inline"></div>
<script type="text/javascript">
  ${embedSnippet}
  Cal${namespace ? `.ns["${namespace}"]` : ""}("inline", {
    elementOrSelector:"#my-cal-inline",
    config: ${JSON.stringify(previewState.inline.config)},
    calLink: "${calLink}",
  });

  ${uiInstructionCode}
</script>
<!-- Cal ${embedType} embed code ends -->`;

    case "floating-popup":
      const floatingButtonArg = JSON.stringify({
        calLink,
        ...(doWeNeedCalOriginProp(embedCalOrigin) ? { calOrigin: embedCalOrigin } : null),
        ...previewState.floatingPopup,
      });
      return `<!-- Cal floating-popup embed code begins -->
<script type="text/javascript">
  ${embedSnippet}
  Cal${namespace ? `.ns["${namespace}"]` : ""}("floatingButton", ${floatingButtonArg});
  ${uiInstructionCode}
</script>
<!-- Cal floating-popup embed code ends -->`;

    case "element-click":
      return `<!-- Cal element-click embed code begins -->
<script type="text/javascript">
  ${embedSnippet}
  
  // Important: Please add the following attributes to the element that should trigger the calendar to open upon clicking.
  // \`data-cal-link="${calLink}"\`
  // data-cal-namespace="${namespace}"
  // \`data-cal-config='${JSON.stringify(previewState.elementClick.config)}'\`

  ${uiInstructionCode}
</script>
<!-- Cal element-click embed code ends -->`;

    case "email":
      return `<!-- Email embed for ${calLink} -->
<a href="${bookerUrl}/${calLink}?theme=${previewState.theme}&layout=${previewState.layout}" 
   style="display: inline-block; 
          padding: 12px 24px; 
          background-color: ${previewState.floatingPopup.buttonColor}; 
          color: ${previewState.floatingPopup.buttonTextColor}; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: 500;">
  ${previewState.floatingPopup.buttonText}
</a>
<!-- End email embed -->`;

    default:
      return "";
  }
};

const generateReactCode = (
  embedType: EmbedType,
  calLink: string,
  previewState: PreviewState,
  namespace: string,
  embedCalOrigin: string
) => {
  const argumentForGetCalApi = namespace
    ? { namespace, embedLibUrl: IS_SELF_HOSTED ? embedLibUrl : undefined }
    : { embedLibUrl: IS_SELF_HOSTED ? embedLibUrl : undefined };
  const uiInstructionCode = getEmbedUIInstructionString({
    apiName: "cal",
    theme: previewState.theme,
    brandColor: previewState.palette.brandColor,
    darkBrandColor: previewState.palette.darkBrandColor,
    hideEventTypeDetails: previewState.hideEventTypeDetails,
    layout: previewState.layout,
  });

  switch (embedType) {
    case "inline":
      const width = getDimension(previewState.inline.width);
      const height = getDimension(previewState.inline.height);
      const namespaceProp = `${namespace ? `namespace="${namespace}"` : ""}`;
      return `/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function MyApp() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi(${argumentForGetCalApi ? JSON.stringify(argumentForGetCalApi) : ""});
      ${uiInstructionCode}
    })();
  }, [])

  return <Cal ${namespaceProp}
    calLink="${calLink}"
    style={{width:"${width}",height:"${height}",overflow:"scroll"}}
    config={${JSON.stringify(previewState.inline.config)}}
    ${doWeNeedCalOriginProp(embedCalOrigin) ? `calOrigin="${embedCalOrigin}"` : ""}
    ${IS_SELF_HOSTED ? `embedJsUrl="${embedLibUrl}"` : ""}
  />;
};`;

    case "floating-popup":
      const floatingButtonArg = JSON.stringify({
        calLink,
        ...(doWeNeedCalOriginProp(embedCalOrigin) ? { calOrigin: embedCalOrigin } : null),
        ...previewState.floatingPopup,
      });
      return `/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function MyApp() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi(${argumentForGetCalApi ? JSON.stringify(argumentForGetCalApi) : ""});
      cal("floatingButton", ${floatingButtonArg});
      ${uiInstructionCode}
    })();
  }, [])
  
  return null;
};`;

    case "element-click":
      return `/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function MyApp() {
  useEffect(()=>{
    (async function () {
      const cal = await getCalApi(${argumentForGetCalApi ? JSON.stringify(argumentForGetCalApi) : ""});
      ${uiInstructionCode}
    })();
  }, [])

  return <button data-cal-namespace="${namespace}"
    data-cal-link="${calLink}"
    ${doWeNeedCalOriginProp(embedCalOrigin) ? `data-cal-origin="${embedCalOrigin}"` : ""}
    ${`data-cal-config='${JSON.stringify(previewState.elementClick.config)}'`}
  >Click me</button>;
};`;

    case "email":
      return `// For email, use HTML format as React components aren't supported in emails
// Use the HTML code provided in the HTML tab`;

    default:
      return "";
  }
};

// Code display component for the dialog
const CodeDisplay = forwardRef<HTMLTextAreaElement, { code: string; language: string; label: string }>(
  ({ code, language, label }, ref) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          color="secondary"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(code);
          }}>
          <Icon name="copy" className="mr-1 h-4 w-4" />
          Copy
        </Button>
      </div>
      <textarea
        ref={ref}
        value={code}
        readOnly
        className="h-64 w-full resize-none rounded-md border bg-gray-50 p-3 font-mono text-xs"
        style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
      />
    </div>
  )
);

CodeDisplay.displayName = "CodeDisplay";

// Code Modal Content component with button-style tabs
const CodeModalContent = ({
  selectedEmbedType,
  calLink,
  previewState,
  namespace,
  bookerUrl,
}: {
  selectedEmbedType: EmbedType;
  calLink: string;
  previewState: PreviewState;
  namespace: string;
  bookerUrl: string;
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<"html" | "react">("html");

  const codeTabOptions = [
    { key: "html", label: "HTML" },
    { key: "react", label: "React" },
  ];

  return (
    <div className="space-y-4">
      {/* Button-style tabs for code types */}
      <div className="flex w-full gap-2">
        {codeTabOptions.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCodeTab(tab.key as "html" | "react")}
            className={`flex-1 rounded-lg border-2 px-6 py-3 text-center transition-all ${
              activeCodeTab === tab.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 hover:border-gray-300"
            }`}>
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Code content based on active tab */}
      {activeCodeTab === "html" && (
        <CodeDisplay
          code={generateHTMLCode(selectedEmbedType, calLink, previewState, namespace, bookerUrl, bookerUrl)}
          language="html"
          label="HTML Code"
        />
      )}

      {activeCodeTab === "react" && (
        <CodeDisplay
          code={generateReactCode(selectedEmbedType, calLink, previewState, namespace, bookerUrl)}
          language="tsx"
          label="React Code"
        />
      )}
    </div>
  );
};

// Enhanced Preview Component (unchanged)
const EmbedPreview = ({
  embedType,
  previewState,
  calLink,
  bookerUrl,
}: {
  embedType: EmbedType;
  previewState: PreviewState;
  calLink: string;
  bookerUrl: string;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const previewInstruction = useCallback(
    (instruction: { name: string; arg: unknown }) => {
      if (!iframeRef.current || !iframeLoaded) return;

      iframeRef.current.contentWindow?.postMessage(
        {
          mode: "cal:preview",
          type: "instruction",
          instruction,
        },
        "*"
      );
    },
    [iframeLoaded]
  );

  const inlineEmbedDimensionUpdate = useCallback(
    ({ width, height }: { width: string; height: string }) => {
      if (!iframeRef.current || !iframeLoaded) return;

      iframeRef.current.contentWindow?.postMessage(
        {
          mode: "cal:preview",
          type: "inlineEmbedDimensionUpdate",
          data: {
            width: getDimension(width),
            height: getDimension(height),
          },
        },
        "*"
      );
    },
    [iframeLoaded]
  );

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  useEffect(() => {
    if (!iframeLoaded || embedType === "email") return;

    previewInstruction({
      name: "ui",
      arg: {
        theme: previewState.theme,
        layout: previewState.layout,
        hideEventTypeDetails: previewState.hideEventTypeDetails,
        cssVarsPerTheme: buildCssVarsPerTheme({
          brandColor: previewState.palette.brandColor,
          darkBrandColor: previewState.palette.darkBrandColor,
        }),
      },
    });

    if (embedType === "floating-popup") {
      previewInstruction({
        name: "floatingButton",
        arg: {
          attributes: {
            id: "my-floating-button",
          },
          ...previewState.floatingPopup,
        },
      });
    }

    if (embedType === "inline") {
      inlineEmbedDimensionUpdate({
        width: previewState.inline.width,
        height: previewState.inline.height,
      });
    }
  }, [embedType, previewState, iframeLoaded, previewInstruction, inlineEmbedDimensionUpdate]);

  if (embedType === "email") {
    return (
      <div className="w-full rounded-lg border bg-white p-6">
        <div className="space-y-4">
          <h5 className="font-semibold">Meeting: 30min call</h5>
          <p className="text-sm text-gray-600">Duration: 30 mins</p>
          <p className="text-sm text-gray-600">Timezone: Your local timezone</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Friday, January 24, 2025</p>
            <div className="flex gap-2">
              {["9:00 AM", "10:00 AM", "11:00 AM"].map((time) => (
                <a
                  key={time}
                  href="#"
                  className="rounded px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: previewState.floatingPopup.buttonColor || "#007ee5",
                    color: previewState.floatingPopup.buttonTextColor || "#ffffff",
                    textDecoration: "none",
                  }}>
                  {time}
                </a>
              ))}
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500">Powered by Cal ID</p>
          </div>
        </div>
      </div>
    );
  }

  const iframeSrc = `${EMBED_PREVIEW_HTML_URL}?embedType=${embedType}&calLink=${calLink}&embedLibUrl=${embedLibUrl}&bookerUrl=${bookerUrl}`;

  return (
    <iframe
      ref={iframeRef}
      className="h-80 w-full rounded-lg border"
      src={iframeSrc}
      onLoad={handleIframeLoad}
      key={iframeSrc}
      title="Embed Preview"
    />
  );
};

// Main component
export const EventEmbed = ({ eventId, calLink: propCalLink }: { eventId?: number; calLink?: string }) => {
  const [selectedEmbedType, setSelectedEmbedType] = useState<EmbedType>("inline");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isEmbedCustomizationOpen, setIsEmbedCustomizationOpen] = useState(true);
  const [isBookingCustomizationOpen, setIsBookingCustomizationOpen] = useState(true);

  // Get user data and booker URL
  const { data } = useSession();
  const bookerUrl = useBookerUrl();
  const { data: user } = trpc.viewer.me.calid_get.useQuery();

  // Use provided calLink or fallback to a default
  const calLink = propCalLink || "john-doe/30min";
  const namespace = "default";
  const eventTypeHideOptionDisabled = false;
  const defaultBrandColor = {
    brandColor: user?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
    darkBrandColor: user?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
  };

  const [previewState, setPreviewState] = useState<PreviewState>({
    inline: {
      width: "100%",
      height: "600px",
      config: {
        layout: "month_view",
      },
    },
    theme: "auto",
    layout: "month_view",
    floatingPopup: {
      config: {
        layout: "month_view",
      },
      buttonText: "Book my Cal",
      hideButtonIcon: false,
      buttonPosition: "bottom-right",
      buttonColor: "#000000",
      buttonTextColor: "#ffffff",
    },
    elementClick: {
      config: {
        layout: "month_view",
      },
    },
    hideEventTypeDetails: false,
    palette: {
      brandColor: defaultBrandColor?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: defaultBrandColor?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const updatePreviewState = (updates: Partial<PreviewState>) => {
    setPreviewState((prev) => ({ ...prev, ...updates }));
  };

  const updatePalette = (updates: Partial<PreviewState["palette"]>) => {
    setPreviewState((prev) => ({
      ...prev,
      palette: { ...prev.palette, ...updates },
    }));
  };

  const themeOptions = [
    { value: "auto", label: "Auto" },
    { value: "light", label: "Light Theme" },
    { value: "dark", label: "Dark Theme" },
  ];

  const layoutOptions = [
    { value: "month_view", label: "Month View" },
    { value: "week_view", label: "Week View" },
    { value: "column_view", label: "Column View" },
  ];

  const positionOptions = [
    { value: "bottom-right", label: "Bottom right" },
    { value: "bottom-left", label: "Bottom left" },
  ];

  const embedTypeOptions = [
    { key: "inline", label: "Inline" },
    { key: "floating-popup", label: "Floating Button" },
    { key: "element-click", label: "Pop up" },
    { key: "email", label: "Email" },
  ];

  return (
    <div className="mx-auto max-w-none p-6">
      <div className="space-y-8">
        {/* Embed Type Selection - Horizontal Tabs */}
        <div className="flex w-full gap-2">
          {embedTypeOptions.map((type) => (
            <Button
              key={type.key}
              color={selectedEmbedType === type.key ? "primary_dim" : "secondary"}
              onClick={() => setSelectedEmbedType(type.key as EmbedType)}
              className={`flex-1 rounded-lg border-2 px-6 py-3 text-center transition-all`}>
              <span className="text-sm font-medium">{type.label}</span>
            </Button>
          ))}
        </div>

        {/* Main Content Area - Split Layout */}
        <div className="flex gap-8">
          {/* Left Side - Configuration */}
          <div className="w-1/2">
            <div className="space-y-6">
              {selectedEmbedType !== "email" && (
                <>
                  {/* Embed Customization */}
                  <Collapsible open={isEmbedCustomizationOpen} onOpenChange={setIsEmbedCustomizationOpen}>
                    <div
                      className="flex cursor-pointer items-center space-x-2"
                      onClick={() => setIsEmbedCustomizationOpen(!isEmbedCustomizationOpen)}>
                      <Icon
                        name={isEmbedCustomizationOpen ? "chevron-down" : "chevron-right"}
                        className="h-4 w-4"
                      />
                      <Label className="text-sm font-medium">Embed Customization</Label>
                    </div>
                    <CollapsibleContent className="mt-4 space-y-4">
                      {/* Window Sizing for Inline */}
                      {selectedEmbedType === "inline" && (
                        <div>
                          <Label className="mb-2 block text-sm font-medium">Window sizing</Label>
                          <div className="flex gap-2">
                            <TextField
                              value={previewState.inline.width}
                              onChange={(e) =>
                                updatePreviewState({
                                  inline: { ...previewState.inline, width: e.target.value },
                                })
                              }
                              placeholder="100%"
                              className="flex-1"
                            />
                            <TextField
                              value={previewState.inline.height}
                              onChange={(e) =>
                                updatePreviewState({
                                  inline: { ...previewState.inline, height: e.target.value },
                                })
                              }
                              placeholder="600px"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      )}

                      {/* Floating Popup Settings */}
                      {selectedEmbedType === "floating-popup" && (
                        <div className="space-y-4">
                          <div>
                            <Label className="mb-2 block text-sm font-medium">Button text</Label>
                            <TextField
                              value={previewState.floatingPopup.buttonText || "Book my Cal"}
                              onChange={(e) =>
                                updatePreviewState({
                                  floatingPopup: {
                                    ...previewState.floatingPopup,
                                    buttonText: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={!previewState.floatingPopup.hideButtonIcon}
                              onCheckedChange={(checked) =>
                                updatePreviewState({
                                  floatingPopup: {
                                    ...previewState.floatingPopup,
                                    hideButtonIcon: !checked,
                                  },
                                })
                              }
                            />
                            <Label className="text-sm">Display calendar icon</Label>
                          </div>

                          <div>
                            <Label className="mb-2 block text-sm font-medium">Position of button</Label>
                            <CustomSelect
                              value={previewState.floatingPopup.buttonPosition || "bottom-right"}
                              onValueChange={(value) =>
                                updatePreviewState({
                                  floatingPopup: {
                                    ...previewState.floatingPopup,
                                    buttonPosition: value as "bottom-right" | "bottom-left",
                                  },
                                })
                              }
                              options={positionOptions}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="mb-2 block text-sm font-medium">Button color</Label>
                              <ColorPicker
                                defaultValue={previewState.floatingPopup.buttonColor || "#000000"}
                                onChange={(color) =>
                                  updatePreviewState({
                                    floatingPopup: {
                                      ...previewState.floatingPopup,
                                      buttonColor: color,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label className="mb-2 block text-sm font-medium">Text color</Label>
                              <ColorPicker
                                defaultValue={previewState.floatingPopup.buttonTextColor || "#ffffff"}
                                onChange={(color) =>
                                  updatePreviewState({
                                    floatingPopup: {
                                      ...previewState.floatingPopup,
                                      buttonTextColor: color,
                                    },
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Booking Customization */}
                  <Collapsible open={isBookingCustomizationOpen} onOpenChange={setIsBookingCustomizationOpen}>
                    <div
                      className="flex cursor-pointer items-center space-x-2"
                      onClick={() => setIsBookingCustomizationOpen(!isBookingCustomizationOpen)}>
                      <Icon
                        name={isBookingCustomizationOpen ? "chevron-down" : "chevron-right"}
                        className="h-4 w-4"
                      />
                      <Label className="text-sm font-medium">Booking Customization</Label>
                    </div>
                    <CollapsibleContent className="mt-4 space-y-4">
                      <div>
                        <Label className="mb-2 block text-sm font-medium">Theme</Label>
                        <CustomSelect
                          value={previewState.theme}
                          onValueChange={(value) => updatePreviewState({ theme: value as EmbedTheme })}
                          options={themeOptions}
                        />
                      </div>

                      {!eventTypeHideOptionDisabled && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={previewState.hideEventTypeDetails}
                            onCheckedChange={(checked) =>
                              updatePreviewState({ hideEventTypeDetails: checked })
                            }
                          />
                          <Label className="text-sm">Hide event type details</Label>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <Label className="mb-2 block text-sm font-medium">Light brand color</Label>
                          <ColorPicker
                            defaultValue={previewState.palette.brandColor || DEFAULT_LIGHT_BRAND_COLOR}
                            onChange={(color) => updatePalette({ brandColor: color })}
                          />
                        </div>
                        <div>
                          <Label className="mb-2 block text-sm font-medium">Dark brand color</Label>
                          <ColorPicker
                            defaultValue={previewState.palette.darkBrandColor || DEFAULT_DARK_BRAND_COLOR}
                            onChange={(color) => updatePalette({ darkBrandColor: color })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mb-2 block text-sm font-medium">Layout</Label>
                        <CustomSelect
                          value={previewState.layout}
                          onValueChange={(value) => updatePreviewState({ layout: value as BookerLayout })}
                          options={layoutOptions}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {/* Email-specific settings */}
              {selectedEmbedType === "email" && (
                <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                  <div>
                    <Label className="mb-2 block text-sm font-medium">Button text</Label>
                    <TextField
                      value={previewState.floatingPopup.buttonText || "Book my Cal"}
                      onChange={(e) =>
                        updatePreviewState({
                          floatingPopup: {
                            ...previewState.floatingPopup,
                            buttonText: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-2 block text-sm font-medium">Button color</Label>
                      <ColorPicker
                        defaultValue={previewState.floatingPopup.buttonColor || "#000000"}
                        onChange={(color) =>
                          updatePreviewState({
                            floatingPopup: {
                              ...previewState.floatingPopup,
                              buttonColor: color,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block text-sm font-medium">Text color</Label>
                      <ColorPicker
                        defaultValue={previewState.floatingPopup.buttonTextColor || "#ffffff"}
                        onChange={(color) =>
                          updatePreviewState({
                            floatingPopup: {
                              ...previewState.floatingPopup,
                              buttonTextColor: color,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-sm font-medium">Theme</Label>
                    <CustomSelect
                      value={previewState.theme}
                      onValueChange={(value) => updatePreviewState({ theme: value as EmbedTheme })}
                      options={themeOptions}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Preview and Get Code Button */}
          <div className="w-1/2">
            <div className="space-y-4">
              {/* Preview */}
              <div className="rounded-lg border bg-white p-4">
                <EmbedPreview
                  embedType={selectedEmbedType}
                  previewState={previewState}
                  calLink={calLink}
                  bookerUrl={bookerUrl}
                />
              </div>

              {/* Get Code Button */}
              <div className="text-center">
                <h4 className="mb-1 text-sm font-medium">Ready to embed?</h4>
                <p className="mb-3 text-xs text-gray-600">Get the code to add to your website</p>
                <Button onClick={() => setShowCodeModal(true)} className="w-full" color="primary" size="lg">
                  <Icon name="copy" className="mr-2 h-4 w-4" />
                  Get Code
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code Modal */}
      <Dialog open={showCodeModal} onOpenChange={setShowCodeModal}>
        <DialogContent className="max-h-[80vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEmbedType !== "email" ? (
              <CodeModalContent
                selectedEmbedType={selectedEmbedType}
                calLink={calLink}
                previewState={previewState}
                namespace={namespace}
                bookerUrl={bookerUrl}
              />
            ) : (
              <div className="space-y-4">
                <CodeDisplay
                  code={generateHTMLCode(
                    selectedEmbedType,
                    calLink,
                    previewState,
                    namespace,
                    bookerUrl,
                    bookerUrl
                  )}
                  language="html"
                  label="Email HTML Code"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
