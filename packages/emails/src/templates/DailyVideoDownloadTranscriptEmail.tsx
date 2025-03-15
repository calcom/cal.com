import type { TFunction } from "next-i18next";

import { WEBAPP_URL, COMPANY_NAME } from "@calcom/lib/constants";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";

import { V2BaseEmailHtml } from "../components";

interface DailyVideoTranscriptEmailProps {
  language: TFunction;
  downloadLinks: string[];
  summaries: string[];
  title: string;
  date: string;
  name: string;
}

export const DailyVideoDownloadTranscriptEmail = ({
  language,
  downloadLinks,
  summaries = [],
  title,
  date,
  name,
}: DailyVideoTranscriptEmailProps & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>) => {
  const image = `${WEBAPP_URL}/emails/logo.png`;
  return (
    <V2BaseEmailHtml
      subject={language("download_transcript_email_subject", {
        title: title,
        date: date,
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
        <>{language("meeting_transcript_and_summary")}</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{language("hi_user_name", { name: name })},</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginBottom: "40px" }}>
        <>{language("you_can_download_transcript_from_attachments")}</>
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
          <>{title}</>
        </p>
        <p
          style={{
            fontWeight: 400,
            lineHeight: "24px",
            marginBottom: "24px",
            marginTop: "0px",
            color: "black",
          }}>
          {date}
        </p>

        {Array.isArray(summaries) &&
          summaries.map((summary, index) => (
            <div
              key={index}
              style={{
                marginTop: index === 0 ? "0" : "32px",
                marginBottom: "32px",
                fontWeight: "400",
                lineHeight: "1.6",
                color: "#374151",
              }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: markdownToSafeHTML(summary),
              }}
            />
          ))}
      </div>

      <p style={{ fontWeight: 400, lineHeight: "24px", marginTop: "32px", marginBottom: "8px" }}>
        <>{language("happy_scheduling")},</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px", marginTop: "0px" }}>
        <>{language("the_calcom_team", { companyName: COMPANY_NAME })}</>
      </p>
    </V2BaseEmailHtml>
  );
};
