import { Button } from "@calid/features/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { Label } from "@calid/features/ui/components/label";
import { Switch } from "@calid/features/ui/components/switch/switch";
import { Collapsible, CollapsibleContent } from "@radix-ui/react-collapsible";
import { useSession } from "next-auth/react";
import React, { useState, useRef, forwardRef, useEffect, useCallback } from "react";
import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { AvailableTimes, AvailableTimesHeader } from "@calcom/features/bookings";
import { useBookerTime } from "@calcom/features/bookings/Booker/components/hooks/useBookerTime";
import { useBookerStore, useInitializeBookerStore } from "@calcom/features/bookings/Booker/store";
import { useEvent, useScheduleForEvent } from "@calcom/features/bookings/Booker/utils/event";
import DatePicker from "@calcom/features/calendars/DatePicker";
import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import { buildCssVarsPerTheme } from "@calcom/features/embed/lib/buildCssVarsPerTheme";
import type { Slot } from "@calcom/features/schedules/lib/use-schedule/types";
import { useNonEmptyScheduleDays } from "@calcom/features/schedules/lib/use-schedule/useNonEmptyScheduleDays";
import { useSlotsForDate } from "@calcom/features/schedules/lib/use-schedule/useSlotsForDate";
import {
  DEFAULT_LIGHT_BRAND_COLOR,
  DEFAULT_DARK_BRAND_COLOR,
  WEBAPP_URL,
  WEBSITE_URL,
  IS_SELF_HOSTED,
  APP_NAME,
} from "@calcom/lib/constants";
import { weekdayToWeekIndex } from "@calcom/lib/dayjs";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";
import { ColorPicker, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

// Types
type EmbedType = "inline" | "floating-popup" | "element-click" | "email";
type EmbedTheme = "auto" | "light" | "dark";
type BookerLayout = "month_view" | "week_view" | "column_view";

type EventType = {
  id: number;
  slug: string;
  length: number;
  title: string;
  teamId: number | null;
  bookerUrl: string;
  seatsShowAvailabilityCount?: boolean;
  metadata?: {
    multipleDuration?: number[];
  };
};

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

// Constants and utility functions
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

function chooseTimezone({
  timezoneFromBookerStore,
  timezoneFromTimePreferences,
  userSettingsTimezone,
}: {
  timezoneFromBookerStore: string | null;
  timezoneFromTimePreferences: string;
  userSettingsTimezone: string | undefined;
}) {
  return timezoneFromBookerStore ?? userSettingsTimezone ?? timezoneFromTimePreferences;
}

// Code generation functions
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

// EmailEmbed Component
const EmailEmbed = ({
  eventType,
  username,
  orgSlug,
  isTeamEvent,
  selectedDuration,
  setSelectedDuration,
  userSettingsTimezone,
}: {
  eventType?: EventType;
  username: string;
  orgSlug?: string;
  isTeamEvent: boolean;
  selectedDuration: number | undefined;
  setSelectedDuration: (duration: number | undefined) => void;
  userSettingsTimezone?: string;
}) => {
  const { t, i18n } = useLocale();
  const { timezoneFromBookerStore, timezoneFromTimePreferences } = useBookerTime();
  const timezone = chooseTimezone({
    timezoneFromBookerStore,
    timezoneFromTimePreferences,
    userSettingsTimezone,
  });

  useInitializeBookerStore({
    username,
    eventSlug: eventType?.slug ?? "",
    eventId: eventType?.id,
    layout: BookerLayouts.MONTH_VIEW,
    org: orgSlug,
    isTeamEvent,
  });

  const [month, selectedDate, selectedDatesAndTimes] = useBookerStore(
    (state) => [state.month, state.selectedDate, state.selectedDatesAndTimes],
    shallow
  );
  const [setSelectedDate, setMonth, setSelectedDatesAndTimes, setSelectedTimeslot, setTimezone] =
    useBookerStore(
      (state) => [
        state.setSelectedDate,
        state.setMonth,
        state.setSelectedDatesAndTimes,
        state.setSelectedTimeslot,
        state.setTimezone,
      ],
      shallow
    );

  const event = useEvent();
  const schedule = useScheduleForEvent({
    orgSlug,
    eventId: eventType?.id,
    isTeamEvent,
    duration: selectedDuration,
    useApiV2: false,
  });
  const nonEmptyScheduleDays = useNonEmptyScheduleDays(schedule?.data?.slots);

  const handleSlotClick = (slot: Slot) => {
    const { time } = slot;
    if (!eventType) {
      return null;
    }
    if (selectedDatesAndTimes && selectedDatesAndTimes[eventType.slug]) {
      const selectedDatesAndTimesForEvent = selectedDatesAndTimes[eventType.slug];
      const selectedSlots = selectedDatesAndTimesForEvent[selectedDate as string] ?? [];
      if (selectedSlots?.includes(time)) {
        if (selectedSlots?.length > 1) {
          const updatedDatesAndTimes = {
            ...selectedDatesAndTimes,
            [eventType.slug]: {
              ...selectedDatesAndTimesForEvent,
              [selectedDate as string]: selectedSlots?.filter((slot: string) => slot !== time),
            },
          };
          setSelectedDatesAndTimes(updatedDatesAndTimes);
        } else {
          const updatedDatesAndTimesForEvent = { ...selectedDatesAndTimesForEvent };
          delete updatedDatesAndTimesForEvent[selectedDate as string];
          setSelectedTimeslot(null);
          setSelectedDatesAndTimes({
            ...selectedDatesAndTimes,
            [eventType.slug]: updatedDatesAndTimesForEvent,
          });
        }
        return;
      }

      const updatedDatesAndTimes = {
        ...selectedDatesAndTimes,
        [eventType.slug]: {
          ...selectedDatesAndTimesForEvent,
          [selectedDate as string]: [...selectedSlots, time],
        },
      };
      setSelectedDatesAndTimes(updatedDatesAndTimes);
    } else if (!selectedDatesAndTimes) {
      setSelectedDatesAndTimes({ [eventType.slug]: { [selectedDate as string]: [time] } });
    } else {
      setSelectedDatesAndTimes({
        ...selectedDatesAndTimes,
        [eventType.slug]: { [selectedDate as string]: [time] },
      });
    }

    setSelectedTimeslot(time);
  };

  const slots = useSlotsForDate(selectedDate, schedule?.data?.slots);

  if (!eventType) {
    return null;
  }
  if (!selectedDuration) {
    setSelectedDuration(eventType.length);
  }

  const multipleDurations = eventType?.metadata?.multipleDuration ?? [];
  const durationsOptions = multipleDurations.map((duration) => ({
    value: duration.toString(),
    label: `${duration} ${t("minutes")}`,
  }));

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block text-sm font-medium">{t("select_date")}</Label>
        <DatePicker
          isLoading={schedule.isPending}
          onChange={(date: Dayjs | null) => {
            setSelectedDate({ date: date === null ? date : date.format("YYYY-MM-DD") });
          }}
          onMonthChange={(date: Dayjs) => {
            setMonth(date.format("YYYY-MM"));
            setSelectedDate({ date: date.format("YYYY-MM-DD") });
          }}
          includedDates={nonEmptyScheduleDays}
          locale={i18n.language}
          browsingDate={month ? dayjs(month) : undefined}
          selected={dayjs(selectedDate)}
          weekStart={weekdayToWeekIndex(event?.data?.subsetOfUsers?.[0]?.weekStart)}
          eventSlug={eventType?.slug}
        />
      </div>

      {selectedDate && (
        <div>
          <AvailableTimesHeader date={dayjs(selectedDate)} />
          <AvailableTimes
            className="w-full"
            selectedSlots={
              eventType.slug &&
              selectedDatesAndTimes &&
              selectedDatesAndTimes[eventType.slug] &&
              selectedDatesAndTimes[eventType.slug][selectedDate as string]
                ? selectedDatesAndTimes[eventType.slug][selectedDate as string]
                : undefined
            }
            handleSlotClick={handleSlotClick}
            slots={slots}
            showAvailableSeatsCount={eventType.seatsShowAvailabilityCount}
            event={event}
          />
        </div>
      )}

      <div>
        <Label className="mb-2 block text-sm font-medium">{t("duration")}</Label>
        {durationsOptions.length > 0 && selectedDuration ? (
          <Select
            value={durationsOptions.find((opt) => opt.value === selectedDuration?.toString())}
            onChange={(option) => {
              setSelectedDuration(parseInt(option?.value || "0"));
              setSelectedDatesAndTimes({});
            }}
            options={durationsOptions}
          />
        ) : (
          <TextField disabled defaultValue={eventType?.length ?? 15} addOnSuffix={<>{t("minutes")}</>} />
        )}
      </div>

      <div>
        <Label className="mb-2 block text-sm font-medium">{t("timezone")}</Label>
        <TimezoneSelect id="timezone" value={timezone} onChange={({ value }) => setTimezone(value)} />
      </div>
    </div>
  );
};

// EmailEmbedPreview Component
const EmailEmbedPreview = ({
  eventType,
  emailContentRef,
  username,
  month,
  selectedDateAndTime,
  calLink,
  selectedDuration,
  userSettingsTimezone,
}: {
  eventType: EventType;
  emailContentRef: React.RefObject<HTMLDivElement>;
  username?: string;
  month?: string;
  selectedDateAndTime: { [key: string]: string[] };
  calLink: string;
  selectedDuration: number | undefined;
  userSettingsTimezone?: string;
}) => {
  const { t } = useLocale();
  const { timeFormat, timezoneFromBookerStore, timezoneFromTimePreferences } = useBookerTime();
  const timezone = chooseTimezone({
    timezoneFromBookerStore,
    timezoneFromTimePreferences,
    userSettingsTimezone,
  });

  if (!eventType) {
    return null;
  }

  return (
    <div className="flex h-full items-center justify-center border p-2 sm:p-5">
      <div
        ref={emailContentRef}
        className="max-h-[50vh] w-full min-w-0 overflow-y-auto bg-white p-2 sm:min-w-[30vw] sm:p-4"
        style={{
          fontSize: "13px",
          color: "black",
          lineHeight: "1.4",
        }}>
        <div className="mb-4 text-xl font-bold">{eventType.title}</div>

        <div className="mb-2 text-sm text-gray-600">
          {t("duration")}: <span className="font-bold text-black">{selectedDuration} mins</span>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          {t("timezone")}: <span className="font-bold text-black">{timezone}</span>
        </div>

        {selectedDateAndTime &&
          Object.keys(selectedDateAndTime)
            .sort()
            .map((key) => {
              const firstSlotOfSelectedDay = selectedDateAndTime[key][0];
              const selectedDate = dayjs(firstSlotOfSelectedDay).tz(timezone).format("dddd, MMMM D, YYYY");

              return (
                <div key={key} className="mb-4">
                  <div className="mb-2 font-bold text-black">{selectedDate}</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedDateAndTime[key]?.map((time) => {
                      const bookingURL = `${eventType.bookerUrl}/${
                        eventType.teamId !== null ? "team/" : ""
                      }${username}/${
                        eventType.slug
                      }?duration=${selectedDuration}&date=${key}&month=${month}&slot=${time}&cal.tz=${timezone}`;

                      return (
                        <a
                          key={time}
                          href={bookingURL}
                          className="inline-block rounded border border-gray-800 px-2 py-1 text-xs font-normal text-gray-800 no-underline">
                          {dayjs.utc(time).tz(timezone).format(timeFormat)}
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}

        <div className="mt-4">
          <a
            href={`${eventType.bookerUrl}/${calLink}?cal.tz=${timezone}`}
            className="cursor-pointer text-black no-underline">
            {t("see_all_available_times")}
          </a>
        </div>

        <div className="mt-4 border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
          <span>{t("powered_by")} </span>
          <span className="font-bold text-black">{APP_NAME}</span>
        </div>
      </div>
    </div>
  );
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
        className="dark:bg-default h-64 w-full resize-none rounded-md border bg-gray-50 p-2 font-mono text-xs sm:p-3"
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
            className={`flex-1 rounded-lg border-2 px-3 py-3 text-center transition-all sm:px-6 ${
              activeCodeTab === tab.key
                ? "border-active bg-primary/10 text-primary"
                : "border-gray-200 dark:border-gray-500 hover:border-gray-300"
            }`}>
            <span className="text-xs font-medium sm:text-sm">{tab.label}</span>
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

// Enhanced Preview Component
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

  const iframeSrc = `${EMBED_PREVIEW_HTML_URL}?embedType=${embedType}&calLink=${calLink}&embedLibUrl=${embedLibUrl}&bookerUrl=${bookerUrl}`;

  return (
    <div className="w-full overflow-hidden rounded-lg border">
      <iframe
        ref={iframeRef}
        className="h-80 w-full"
        src={iframeSrc}
        onLoad={handleIframeLoad}
        key={iframeSrc}
        title="Embed Preview"
      />
    </div>
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

  // Email-specific state and data
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(undefined);
  const emailContentRef = useRef<HTMLDivElement>(null);
  const [month, selectedDatesAndTimes] = useBookerStore(
    (state) => [state.month, state.selectedDatesAndTimes],
    shallow
  );

  // Get event type data for email embed
  const { data: eventTypeData } = trpc.viewer.eventTypes.get.useQuery(
    { id: eventId || -1 },
    { enabled: !!eventId && selectedEmbedType === "email", refetchOnWindowFocus: false }
  );

  const { data: userSettings } = trpc.viewer.me.get.useQuery();

  const [previewState, setPreviewState] = useState<PreviewState>({
    inline: {
      width: "100%",
      height: "100%",
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
      buttonText: "Book my Cal ID",
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

  // Copy email text function
  const handleCopyEmailText = () => {
    const contentElement = emailContentRef.current;
    if (contentElement !== null) {
      const range = document.createRange();
      range.selectNode(contentElement);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
      }
      showToast("Content copied", "success");
    }
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
    <div className="mx-auto max-w-none">
      <div className="space-y-8">
        {/* Embed Type Selection - Responsive Tabs */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-full">
          {embedTypeOptions.map((type) => (
            <Button
              key={type.key}
              color={selectedEmbedType === type.key ? "primary" : "secondary"}
              onClick={() => setSelectedEmbedType(type.key as EmbedType)}
              className="flex-1 rounded-lg border-2 px-3 py-3 text-center transition-all sm:px-6">
              <span className="text-xs font-medium sm:text-sm">{type.label}</span>
            </Button>
          ))}
        </div>

        {/* Main Content Area - Responsive Layout */}
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Left Side - Configuration */}
          <div className="w-full lg:w-1/3">
            <div className="space-y-6">
              {selectedEmbedType === "email" && eventTypeData?.eventType ? (
                <EmailEmbed
                  eventType={{
                    ...eventTypeData.eventType,
                    seatsShowAvailabilityCount: eventTypeData.eventType.seatsShowAvailabilityCount ?? false,
                  }}
                  username={data?.user?.username || ""}
                  userSettingsTimezone={userSettings?.timeZone}
                  orgSlug={data?.user?.org?.slug}
                  isTeamEvent={!!eventTypeData.eventType.teamId}
                  selectedDuration={selectedDuration}
                  setSelectedDuration={setSelectedDuration}
                />
              ) : selectedEmbedType !== "email" ? (
                <>
                  {/* Embed Customization */}
                  {selectedEmbedType !== "element-click" && (
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
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <TextField
                                value={previewState.inline.width}
                                onChange={(e) =>
                                  updatePreviewState({
                                    inline: { ...previewState.inline, width: e.target.value },
                                  })
                                }
                                placeholder="100%"
                                addOnLeading="W"
                                className="flex-1"
                              />
                              <TextField
                                value={previewState.inline.height}
                                onChange={(e) =>
                                  updatePreviewState({
                                    inline: { ...previewState.inline, height: e.target.value },
                                  })
                                }
                                placeholder="100%"
                                addOnLeading="H"
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
                                value={previewState.floatingPopup.buttonText || "Book my Cal ID"}
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
                              <Select
                                value={positionOptions.find(
                                  (opt) =>
                                    opt.value ===
                                    (previewState.floatingPopup.buttonPosition || "bottom-right")
                                )}
                                onChange={(option) =>
                                  updatePreviewState({
                                    floatingPopup: {
                                      ...previewState.floatingPopup,
                                      buttonPosition:
                                        (option?.value as "bottom-right" | "bottom-left") || "bottom-right",
                                    },
                                  })
                                }
                                options={positionOptions}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  )}

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
                        <Select
                          value={themeOptions.find((opt) => opt.value === previewState.theme)}
                          onChange={(option) =>
                            updatePreviewState({ theme: (option?.value as EmbedTheme) || "auto" })
                          }
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
                        <Select
                          value={layoutOptions.find((opt) => opt.value === previewState.layout)}
                          onChange={(option) =>
                            updatePreviewState({ layout: (option?.value as BookerLayout) || "month_view" })
                          }
                          options={layoutOptions}
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              ) : null}
            </div>
          </div>

          {/* Right Side - Preview and Get Code Button: */}
          <div className="w-full lg:w-2/3">
            <div className="space-y-4 p-2">
              {/* Preview */}
              {selectedEmbedType === "email" && eventTypeData?.eventType ? (
                <EmailEmbedPreview
                  eventType={{
                    ...eventTypeData.eventType,
                    seatsShowAvailabilityCount: eventTypeData.eventType.seatsShowAvailabilityCount ?? false,
                  }}
                  emailContentRef={emailContentRef}
                  username={data?.user?.username ?? undefined}
                  userSettingsTimezone={userSettings?.timeZone}
                  month={month as string}
                  selectedDateAndTime={
                    selectedDatesAndTimes
                      ? selectedDatesAndTimes[eventTypeData.eventType.slug as string] || {}
                      : {}
                  }
                  calLink={calLink}
                  selectedDuration={selectedDuration}
                />
              ) : (
                <EmbedPreview
                  embedType={selectedEmbedType}
                  previewState={previewState}
                  calLink={calLink}
                  bookerUrl={bookerUrl}
                />
              )}

              {/* Get Code Button */}
              <div className="text-center">
                {selectedEmbedType !== "email" && (
                  <>
                    <h4 className="mb-1 text-sm font-medium">Ready to embed?</h4>
                    <p className="dark:text-default mb-3 text-xs text-gray-600">
                      Get the code to add to your website
                    </p>
                  </>
                )}
                <Button
                  StartIcon="copy"
                  onClick={() => {
                    if (selectedEmbedType === "email") {
                      handleCopyEmailText();
                    } else {
                      setShowCodeModal(true);
                    }
                  }}
                  className="flex w-full justify-center"
                  color="primary"
                  size="lg">
                  {selectedEmbedType === "email" ? "Copy Email Content" : "Get Code"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code Modal */}
      <Dialog open={showCodeModal} onOpenChange={setShowCodeModal}>
        <DialogContent className="max-h-[80vh] w-[95vw] max-w-4xl sm:w-full">
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
