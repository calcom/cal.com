import BaseTable from "./BaseTable";
import RawHtml from "./RawHtml";

const EmailFooterBand = () => (
  <BaseTable align="center" border="0" style={{ width: "100%", borderCollapse: "collapse" }}>
    <tbody>
      <tr>
        <td align="center" style={{ padding: "16px 0 0 0" }}>
          <RawHtml
            html={`<!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600" bgcolor="#2E4F4F" ><tr><td><![endif]-->`}
          />
          <BaseTable
            align="center"
            border="0"
            style={{
              margin: "0px auto",
              maxWidth: 600,
              width: "100%",
              borderCollapse: "collapse",
              borderRadius: "8px",
              backgroundColor: "#2E4F4F",
            }}>
            <tbody>
              <tr>
                <td
                  align="center"
                  style={{
                    padding: "20px 25px",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    textAlign: "center",
                    backgroundColor: "#2E4F4F",
                  }}>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "bold",
                      lineHeight: "20px",
                      color: "#FFFFFF",
                    }}>
                    Sunset Services U.S.
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "20px", color: "#C9D6CF" }}>
                    <a
                      href="https://sunsetservices.us"
                      style={{ color: "#C9D6CF", textDecoration: "none" }}>
                      sunsetservices.us
                    </a>
                    {" · "}
                    <a
                      href="mailto:bookings@sunsetservices.us"
                      style={{ color: "#C9D6CF", textDecoration: "none" }}>
                      bookings@sunsetservices.us
                    </a>
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "20px", color: "#C9D6CF" }}>
                    1630 Mountain Street, Aurora, IL 60505
                  </div>
                </td>
              </tr>
            </tbody>
          </BaseTable>
          <RawHtml html={`<!--[if mso | IE]></td></tr></table><![endif]-->`} />
        </td>
      </tr>
    </tbody>
  </BaseTable>
);

export default EmailFooterBand;
