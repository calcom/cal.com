import { TFunction } from "next-i18next";

import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";

export const AppsStatus = (props: { calEvent: CalendarEvent; t: TFunction }) => {
  const { t } = props;
  if (!props.calEvent.appsStatus) return null;
  return (
    <Info
      label={t("apps_status")}
      description={
        <ul style={{ lineHeight: "24px" }}>
          {props.calEvent.appsStatus.map((status) => (
            <li key={status.type} style={{ fontWeight: 400 }}>
              {status.appName}{" "}
              {status.success >= 1 && `✅ ${status.success > 1 ? `(x${status.success})` : ""}`}{" "}
              {status.failures >= 1 && `❌ ${status.failures > 1 ? `(x${status.failures})` : ""}`}
            </li>
          ))}
        </ul>
      }
      withSpacer
    />
  );
};
