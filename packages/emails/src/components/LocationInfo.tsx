import type { TFunction } from "next-i18next";

import { getAppName } from "@calcom/app-store/utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";
import { LinkIcon } from "./LinkIcon";

export function LocationInfo(props: { calEvent: CalendarEvent; t: TFunction }) {
  const { t } = props;
  let providerName = props.calEvent.location && getAppName(props.calEvent.location);

  if (props.calEvent.location && props.calEvent.location.includes("integrations:")) {
    const location = props.calEvent.location.split(":")[1];
    providerName = location[0].toUpperCase() + location.slice(1);
  }

  // If location its a url, probably we should be validating it with a custom library
  if (props.calEvent.location && /^https?:\/\//.test(props.calEvent.location)) {
    providerName = props.calEvent.location;
  }

  if (props.calEvent.videoCallData) {
    const meetingId = props.calEvent.videoCallData.id;
    const meetingPassword = props.calEvent.videoCallData.password;
    const meetingUrl = props.calEvent.videoCallData.url;

    return (
      <Info
        label={t("where")}
        withSpacer
        description={
          meetingUrl ? (
            <a
              href={meetingUrl}
              target="_blank"
              title={t("meeting_url")}
              style={{ color: "#3E3E3E" }}
              rel="noreferrer">
              {providerName} <LinkIcon />
            </a>
          ) : (
            <>{t("something_went_wrong")}</>
          )
        }
        extraInfo={
          <>
            {meetingId && (
              <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
                <>
                  {t("meeting_id")}: <span>{meetingId}</span>
                </>
              </div>
            )}
            {meetingPassword && (
              <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
                <>
                  {t("meeting_password")}: <span>{meetingPassword}</span>
                </>
              </div>
            )}
            {meetingUrl && (
              <div style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
                <>
                  {t("meeting_url")}:{" "}
                  <a href={meetingUrl} title={t("meeting_url")} style={{ color: "#3E3E3E" }}>
                    {meetingUrl}
                  </a>
                </>
              </div>
            )}
          </>
        }
      />
    );
  }

  if (props.calEvent.additionalInformation?.hangoutLink) {
    const hangoutLink: string = props.calEvent.additionalInformation.hangoutLink;

    return (
      <Info
        label={t("where")}
        withSpacer
        description={
          <a
            href={hangoutLink}
            target="_blank"
            title={t("meeting_url")}
            style={{ color: "#3E3E3E" }}
            rel="noreferrer">
            Google <LinkIcon />
          </a>
        }
      />
    );
  }
  return (
    <Info
      label={t("where")}
      withSpacer
      description={providerName || props.calEvent.location}
      extraInfo={
        (providerName === "Zoom" || providerName === "Google") && props.calEvent.requiresConfirmation ? (
          <p style={{ color: "#494949", fontWeight: 400, lineHeight: "24px" }}>
            <>{t("meeting_url_provided_after_confirmed")}</>
          </p>
        ) : null
      }
    />
  );
}
