import type { TFunction } from "i18next";
import React from "react";

import getLabelValueMapFromResponses from "@calcom/lib/getLabelValueMapFromResponses";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export function UserFieldsResponses(props: { calEvent: CalendarEvent; t: TFunction; isOrganizer?: boolean }) {
  const { t, isOrganizer = false } = props;
  const labelValueMap = getLabelValueMapFromResponses(props.calEvent, isOrganizer);

  if (!labelValueMap) return null;
  return (
    <>
      {Object.keys(labelValueMap).map((key) => {
        const val = labelValueMap[key];
        if (val === "") return null;

        return (
          <Info
            key={key}
            label={t(key)}
            description={(() => {
              if (typeof val === "boolean") {
                return val ? t("yes") : t("no");
              }
              if (val && typeof val === "object") {
                if (Array.isArray(val)) {
                  if (val.length === 0) return "";
                  // Check if it's an array of attachments
                  if (
                    typeof val[0] === "object" &&
                    val[0] !== null &&
                    ("url" in val[0] || "dataUrl" in val[0])
                  ) {
                    return val.map((file: { name?: string }) => file.name || t("attachment")).join(", ");
                  }
                  return val.join(", ");
                }
                // Check if it's a single attachment
                if ("url" in val || "dataUrl" in val) {
                  return (val as { name?: string }).name || t("attachment");
                }
                if ("value" in val && "optionValue" in val) {
                  const optionVal = val as { value: string; optionValue?: string };
                  return `${optionVal.value}${optionVal.optionValue ? `: ${optionVal.optionValue}` : ""}`;
                }
              }
              return `${val ? val : ""}`;
            })()}
            withSpacer
            isLabelHTML
          />
        );
      })}
    </>
  );
}
