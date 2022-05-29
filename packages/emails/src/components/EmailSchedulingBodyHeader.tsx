import { BASE_URL, IS_PRODUCTION } from "@calcom/lib/constants";

import EmailCommonDivider from "./EmailCommonDivider";
import RawHtml from "./RawHtml";
import Row from "./Row";

export type BodyHeadType = "checkCircle" | "xCircle" | "calendarCircle";

export const getHeadImage = (headerType: BodyHeadType): string => {
  switch (headerType) {
    case "checkCircle":
      return IS_PRODUCTION
        ? BASE_URL + "/emails/checkCircle@2x.png"
        : "https://app.cal.com/emails/checkCircle@2x.png";
    case "xCircle":
      return IS_PRODUCTION
        ? BASE_URL + "/emails/xCircle@2x.png"
        : "https://app.cal.com/emails/xCircle@2x.png";
    case "calendarCircle":
      return IS_PRODUCTION
        ? BASE_URL + "/emails/calendarCircle@2x.png"
        : "https://app.cal.com/emails/calendarCircle@2x.png";
  }
};

const EmailSchedulingBodyHeader = (props: { headerType: BodyHeadType }) => {
  const image = getHeadImage(props.headerType);

  return (
    <>
      <RawHtml
        html={`<!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->`}
      />
      <div style={{ margin: "0px auto", maxWidth: 600 }}>
        <Row align="center" border="0" style={{ width: "100%" }}>
          <td
            style={{
              direction: "ltr",
              fontSize: "0px",
              padding: "0px",
              paddingTop: "40px",
              textAlign: "center",
            }}>
            <RawHtml
              html={`<!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr></tr></table><![endif]-->`}
            />
          </td>
        </Row>
      </div>
      <EmailCommonDivider headStyles={{ padding: "30px 30px 0 30px", borderTop: "1px solid #E1E1E1" }}>
        <td
          align="center"
          style={{
            fontSize: "0px",
            padding: "10px 25px",
            wordBreak: "break-word",
          }}>
          <Row border="0" role="presentation" style={{ borderCollapse: "collapse", borderSpacing: "0px" }}>
            <td style={{ width: 64 }}>
              <img
                height="64"
                src={image}
                style={{
                  border: "0",
                  display: "block",
                  outline: "none",
                  textDecoration: "none",
                  height: "64px",
                  width: "100%",
                  fontSize: "13px",
                }}
                width="64"
                alt=""
              />
            </td>
          </Row>
        </td>
      </EmailCommonDivider>
    </>
  );
};

export default EmailSchedulingBodyHeader;
