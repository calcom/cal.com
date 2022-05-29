/* eslint-disable @next/next/no-head-element */
import Head from "./Head";

const HeadComment = ({ before = "", text = "", after = "" }) => (
  <script dangerouslySetInnerHTML={{ __html: `</script>${before}${text}${after}<script>` }} />
);

export const EmailHtml = () => {
  return (
    <html
    // xmlns="http://www.w3.org/1999/xhtml"
    // xmlns:v="urn:schemas-microsoft-com:vml"
    // xmlns:o="urn:schemas-microsoft-com:office:office"
    >
      <Head title="Title" />
      <body style={{ wordSpacing: "normal", backgroundColor: "#F5F5F5" }}>
        <div style={{ backgroundColor: "#F5F5F5" }}>
          {/* ${emailSchedulingBodyHeader("calendarCircle")}$
          {emailScheduledBodyHeaderContent(
            this.attendee.language.translate("meeting_awaiting_payment"),
            this.attendee.language.translate("emailed_you_and_any_other_attendees")
          )}
          ${emailSchedulingBodyDivider()} */}
          <HeadComment
            before="<!--[if mso | IE]>"
            text={`</td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" className="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">`}
            after="<![endif]-->"
          />
          <div
            style={{
              background: "#FFFFFF",
              backgroundColor: "#FFFFFF",
              margin: "0px auto",
              maxWidth: 600,
            }}>
            <table
              // align="center"
              // border="0"
              cellPadding="0"
              cellSpacing="0"
              role="presentation"
              style={{ background: "#FFFFFF", backgroundColor: "#FFFFFF", width: "100%" }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      borderLeft: "1px solid #E1E1E1",
                      borderRight: "1px solid #E1E1E1",
                      direction: "ltr",
                      fontSize: 0,
                      padding: 0,
                      textAlign: "center",
                    }}>
                    <HeadComment
                      before="<!--[if mso | IE]>"
                      text={`<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td className="" style="vertical-align:top;width:598px;" >`}
                      after="<![endif]-->"
                    />
                    <div
                      className="mj-column-per-100 mj-outlook-group-fix"
                      style={{
                        fontSize: 0,
                        textAlign: "left",
                        direction: "ltr",
                        display: "inline-block",
                        verticalAlign: "top",
                        width: "100%",
                      }}>
                      <table
                        // border="0"
                        cellPadding="0"
                        cellSpacing="0"
                        role="presentation"
                        style={{ verticalAlign: "top" }}
                        width="100%">
                        <tbody>
                          <tr>
                            <td
                              align="left"
                              style={{ fontSize: 0, padding: "10px 25px", wordBreak: "break-word" }}>
                              <div
                                style={{
                                  fontFamily: "Roboto, Helvetica, sans-serif",
                                  fontSize: 16,
                                  fontWeight: 500,
                                  lineHeight: 1,
                                  textAlign: "left",
                                  color: "#3E3E3E",
                                }}>
                                {/* ${this.getWhat()}${this.getWhen()}${this.getWho()}${this.getLocation()}$
                                {this.getDescription()}${this.getAdditionalNotes()}${this.getCustomInputs()} */}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <HeadComment
                      before="<!--[if mso | IE]>"
                      text={`</td></tr></table>`}
                      after="<![endif]-->"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* ${emailSchedulingBodyDivider()} */}
          <HeadComment
            before="<!--[if mso | IE]>"
            text={`</td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" className="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">`}
            after="<![endif]-->"
          />
          <div
            style={{
              background: "#FFFFFF",
              backgroundColor: "#FFFFFF",
              margin: "0px auto",
              maxWidth: 600,
            }}>
            <table
              // align="center"
              // border={0}
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
              style={{ background: "#FFFFFF", backgroundColor: "#FFFFFF", width: "100%" }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      borderBottom: "1px solid #E1E1E1",
                      borderLeft: "1px solid #E1E1E1",
                      borderRight: "1px solid #E1E1E1",
                      direction: "ltr",
                      fontSize: 0,
                      padding: 0,
                      textAlign: "center",
                    }}>
                    <HeadComment
                      before="<!--[if mso | IE]>"
                      text={`<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td className="" style="vertical-align:top;width:598px;" >`}
                      after="<![endif]-->"
                    />
                    <div
                      className="mj-column-per-100 mj-outlook-group-fix"
                      style={{
                        fontSize: 0,
                        textAlign: "left",
                        direction: "ltr",
                        display: "inline-block",
                        verticalAlign: "top",
                        width: "100%",
                      }}>
                      <table
                        // border="0"
                        cellPadding="0"
                        cellSpacing="0"
                        role="presentation"
                        style={{ verticalAlign: "top" }}
                        width="100%">
                        <tbody>
                          <tr>
                            <td
                              align="center"
                              vertical-align="middle"
                              style={{ fontSize: 0, padding: "10px 25px", wordBreak: "break-word" }}>
                              <table
                                // border="0"
                                cellPadding="0"
                                cellSpacing="0"
                                role="presentation"
                                style={{ borderCollapse: "separate", lineHeight: "100%" }}>
                                {/* ${this.getManageLink()} */}
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td
                              align="left"
                              style={{ fontSize: 0, padding: "10px 25px", wordBreak: "break-word" }}>
                              <div
                                style={{
                                  fontFamily: "Roboto, Helvetica, sans-serif",
                                  fontSize: 13,
                                  lineHeight: 1,
                                  textAlign: "left",
                                  color: "#000000",
                                }}></div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <HeadComment
                      before="<!--[if mso | IE]>"
                      text={`</td></tr></table>`}
                      after="<![endif]-->"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* ${emailBodyLogo()} */}
          <HeadComment before="<!--[if mso | IE]>" text={`</td></tr></table>`} after="<![endif]-->" />
        </div>
      </body>
    </html>
  );
};
