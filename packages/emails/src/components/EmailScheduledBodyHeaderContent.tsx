import type { CSSProperties } from "react";

import EmailCommonDivider from "./EmailCommonDivider";

/**
 * Decodes ONLY safe HTML entities in subtitle text
 * Fixes issue #26938 where special characters like / display as &#x2F; in emails
 * 
 * Security: Only decodes safe entities. Does NOT decode &lt; or &gt; to prevent HTML injection.
 */
const getDecodedSubtitle = (subtitle: React.ReactNode): React.ReactNode => {
  if (typeof subtitle !== "string") {
    return subtitle;
  }

  // Map of safe HTML entities to decode
  // Explicitly excludes &lt; and &gt; to prevent HTML injection attacks
  const safeEntities: Record<string, string> = {
    "&#x2F;": "/",
    "&#47;": "/",
    "&#x27;": "'",
    "&#39;": "'",
    "&quot;": '"',
    "&apos;": "'",
    "&amp;": "&",
    "&#34;": '"',
  };

  let result = subtitle;
  
  // Replace each safe entity with its character
  for (const [entity, char] of Object.entries(safeEntities)) {
    result = result.replace(new RegExp(entity, "g"), char);
  }
  
  return result;
};

const EmailScheduledBodyHeaderContent = (props: {
  title: string;
  subtitle?: React.ReactNode;
  headStyles?: CSSProperties;
}) => (
  <EmailCommonDivider headStyles={{ padding: 0, ...props.headStyles }} mutipleRows>
    <tr>
      <td
        align="center"
        style={{
          fontSize: 0,
          padding: "10px 25px",
          paddingTop: 24,
          paddingBottom: 0,
          wordBreak: "break-word",
        }}>
        <div
          data-testid="heading"
          style={{
            fontFamily: "Roboto, Helvetica, sans-serif",
            fontSize: 24,
            fontWeight: 700,
            lineHeight: "24px",
            textAlign: "center",
            color: "#111827",
          }}>
          {props.title}
        </div>
      </td>
    </tr>
    {props.subtitle && (
      <tr>
        <td align="center" style={{ fontSize: 0, padding: "10px 25px", wordBreak: "break-word" }}>
          <div
            data-testid="subHeading"
            style={{
              fontFamily: "Roboto, Helvetica, sans-serif",
              fontSize: 16,
              fontWeight: 400,
              lineHeight: "24px",
              textAlign: "center",
              color: "#4B5563",
            }}>
            {getDecodedSubtitle(props.subtitle)}
          </div>
        </td>
      </tr>
    )}
  </EmailCommonDivider>
);

export default EmailScheduledBodyHeaderContent;
