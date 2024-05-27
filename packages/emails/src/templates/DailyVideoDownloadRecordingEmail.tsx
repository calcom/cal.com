import type { TFunction } from "next-i18next";
import { Trans } from "next-i18next";

import { WEBAPP_URL, APP_NAME, COMPANY_NAME } from "@calcom/lib/constants";

import { V2BaseEmailHtml, CallToAction } from "../components";

interface DailyVideoDownloadRecordingEmailProps {
  language: TFunction;
  downloadLink: string;
  title: string;
  date: string;
  name: string;
}

export const DailyVideoDownloadRecordingEmail = (
  props: DailyVideoDownloadRecordingEmailProps & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  const image = `${WEBAPP_URL}/emails/logo.png`;
  return (
    <V2BaseEmailHtml
      subject={props.language("download_your_recording", {
        title: props.title,
        date: props.date,
      })}>
      <div style={{ width: "89px", marginBottom: "35px" }}>
        <a href={WEBAPP_URL} target="_blank" rel="noreferrer">
          <img
            height="19"
            src={image}
            style={{
              border: "0",
              display: "block",
              outline: "none",
              textDecoration: "none",
              height: "19px",
              width: "100%",
              fontSize: "13px",
            }}
            width="89"
            alt=""
          />
        </a>
      </div>
      <p
        style={{
          fontSize: "32px",
          fontWeight: "600",
          lineHeight: "38.5px",
          marginBottom: "40px",
          color: "black",
        }}>
        <>{props.language("download_your_recording")}</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{props.language("hi_user_name", { name: props.name })},</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "40px" }}>
        <>{props.language("recording_from_your_recent_call", { appName: APP_NAME })}</>
      </p>

      <div
        style={{
          backgroundColor: "#F3F4F6",
          padding: "32px",
          marginBottom: "40px",
        }}>
        <p
          style={{
            fontSize: "18px",
            lineHeight: "20px",
            fontWeight: 600,
            marginBottom: "8px",
            color: "black",
          }}>
          <>{props.title}</>
        </p>
        <p
          style={{
            fontWeight: 400,
            lineHeight: "24px",
            marginBottom: "24px",
            marginTop: "0px",
            color: "black",
          }}>
          {props.date}
        </p>
        <CallToAction label={props.language("download_recording")} href={props.downloadLink} />
      </div>

      <p style={{ fontWeight: 500, lineHeight: "20px", marginTop: "8px" }}>
        <Trans i18nKey="link_valid_for_12_hrs">
          Note: The download link is valid only for 12 hours. You can generate new download link by following
          instructions
          <a href="https://cal.com/docs/enterprise-features/teams/cal-video-recordings"> here</a>
        </Trans>
      </p>

      <p style={{ fontWeight: 400, lineHeight: "24px", marginTop: "32px", marginBottom: "8px" }}>
        <>{props.language("happy_scheduling")},</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginTop: "0px" }}>
        <>{props.language("the_calcom_team", { companyName: COMPANY_NAME })}</>
      </p>
    </V2BaseEmailHtml>
  );
};
