import RawHtml from "./RawHtml";
import Row from "./Row";

const EmailCommonDivider = ({
  children,
  mutipleRows = false,
  headStyles,
}: {
  children: React.ReactNode;
  mutipleRows?: boolean;
  headStyles?: React.DetailedHTMLProps<
    React.TdHTMLAttributes<HTMLTableCellElement>,
    HTMLTableCellElement
  >["style"];
}) => {
  return (
    <>
      <RawHtml
        html={`<!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->`}
      />
      <div
        style={{
          background: "#FFFFFF",
          backgroundColor: "#FFFFFF",
          margin: "0px auto",
          maxWidth: 600,
        }}>
        <Row
          align="center"
          border="0"
          style={{
            background: "#FFFFFF",
            backgroundColor: "#FFFFFF",
            width: "100%",
          }}>
          <td
            style={{
              borderLeft: "1px solid #E1E1E1",
              borderRight: "1px solid #E1E1E1",
              direction: "ltr",
              fontSize: 0,
              padding: "15px 0px 0 0px",
              textAlign: "center",
              ...headStyles,
            }}>
            <RawHtml
              html={`<!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:598px;" ><![endif]-->`}
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
              <Row border="0" style={{ verticalAlign: "top" }} width="100%" multiple={mutipleRows}>
                {children}
              </Row>
            </div>
            <RawHtml html="<!--[if mso | IE]></td></tr></table><![endif]-->" />
          </td>
        </Row>
      </div>
    </>
  );
};

export default EmailCommonDivider;
