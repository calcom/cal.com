import type { TFunction } from "next-i18next";

import { guessEventLocationType } from "@calcom/app-store/locations";
import { getVideoCallPassword, getVideoCallUrl } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { Info } from "./Info";
import { LinkIcon } from "./LinkIcon";

export function LocationInfo(props: { calEvent: CalendarEvent; t: TFunction }) {
  const { t } = props;
  logger.debug(`LocationInfo: ${JSON.stringify(props.calEvent)}`);

  // We would not be able to determine provider name for DefaultEventLocationTypes
  const providerName = guessEventLocationType(props.calEvent.location)?.label;

  const location = props.calEvent.location;
  const link =
    props.calEvent.additionalInformation?.hangoutLink || location?.search(/^https?:/) !== -1
      ? location
      : undefined;

  if (props.calEvent.videoCallData) {
    const meetingId = props.calEvent.videoCallData.id;
    const meetingPassword = getVideoCallPassword(props.calEvent);
    const meetingUrl = getVideoCallUrl(props.calEvent);

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
  // Because of location being a value here, we can determine the app that generated the location only for Dynamic Link based apps where the value is integrations:*
  // For static link based location apps, the value is that URL itself. So, it is not straightforward to determine the app that generated the location.
  // If we know the App we can always provide the name of the app like we do it for Google Hangout/Google Meet

  if (link) {
    return (
      <Info
        label={t("where")}
        withSpacer
        description={
          <a
            href={link}
            target="_blank"
            title={t("meeting_url")}
            style={{ color: "#3E3E3E" }}
            rel="noreferrer">
            {providerName || "Link"} <LinkIcon />
          </a>
        }
      />
    );
  }
  return (
    <Info
      label={t("where")}
      withSpacer
      description={providerName || location}
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
