import type { TFunction } from "next-i18next";

import { WEBAPP_URL, APP_NAME, COMPANY_NAME } from "@calcom/lib/constants";

import { V2BaseEmailHtml } from "../components";

interface TranscriptEntry {
  speaker: string;
  text: string;
  time: string;
}

interface DailyVideoDownloadTranscriptEmailProps {
  language: TFunction;
  title: string;
  date: string;
  name: string;
  transcripts?: Array<TranscriptEntry>;
}

export const DailyVideoDownloadTranscriptEmail = (
  props: DailyVideoDownloadTranscriptEmailProps & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  const image = `${WEBAPP_URL}/emails/logo.png`;
  return (
    <V2BaseEmailHtml
      subject={props.language("download_transcript_email_subject", {
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
        <>{props.language("download_your_transcripts")}</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{props.language("hi_user_name", { name: props.name })},</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "40px" }}>
        <>{props.language("transcript_from_previous_call", { appName: APP_NAME })}</>
      </p>

      {props.transcripts.map((transcript, index) => {
        return (
          <div
            key={index}
            style={{
              backgroundColor: "#F3F4F6",
              padding: "32px",
              marginBottom: "40px",
            }}>
            <div style={{ marginTop: "40px", marginBottom: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "16px" }}>
                {props.date} Transcript {index + 1}
              </h2>
              <div
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: "16px",
                  borderRadius: "4px",
                  fontFamily: "sans-serif",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  maxHeight: "400px",
                  overflowY: "auto",
                }}>
                {transcript.map((entry, index) => (
                  <div key={index} style={{ marginBottom: "16px" }}>
                    <div>
                      <span style={{ fontWeight: "bold", color: "#4B5563" }}>{entry.speaker}: </span>
                      <span>{entry.text}</span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6B7280",
                        marginTop: "1px",
                      }}>
                      {entry.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <p style={{ fontWeight: 400, lineHeight: "24px", marginTop: "32px", marginBottom: "8px" }}>
        <>{props.language("happy_scheduling")},</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginTop: "0px" }}>
        <>{props.language("the_calcom_team", { companyName: COMPANY_NAME })}</>
      </p>
    </V2BaseEmailHtml>
  );
};
