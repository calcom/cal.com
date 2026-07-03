import BaseTable from "./BaseTable";
import RawHtml from "./RawHtml";

const EmailAccentLine = () => (
  <BaseTable align="center" border="0" style={{ width: "100%", borderCollapse: "collapse" }}>
    <tbody>
      <tr>
        <td align="center" style={{ padding: 0 }}>
          <RawHtml
            html={`<!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" style="width:600px;" width="600" ><tr><td style="height:3px;line-height:3px;font-size:3px;background-color:#F28C38;mso-line-height-rule:exactly;">&nbsp;</td></tr></table><![endif]-->`}
          />
          <BaseTable
            align="center"
            border="0"
            style={{ margin: "0px auto", maxWidth: 600, width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td
                  style={{
                    height: "3px",
                    lineHeight: "3px",
                    fontSize: "3px",
                    backgroundColor: "#F28C38",
                  }}>
                  &nbsp;
                </td>
              </tr>
            </tbody>
          </BaseTable>
        </td>
      </tr>
    </tbody>
  </BaseTable>
);

export default EmailAccentLine;
