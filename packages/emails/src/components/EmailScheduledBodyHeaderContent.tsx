import EmailCommonDivider from "./EmailCommonDivider";

const EmailScheduledBodyHeaderContent = (props: { title: string; subtitle?: React.ReactNode }) => (
  <EmailCommonDivider headStyles={{ padding: 0 }} mutipleRows>
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
          style={{
            fontFamily: "Roboto, Helvetica, sans-serif",
            fontSize: 24,
            fontWeight: 700,
            lineHeight: "24px",
            textAlign: "center",
            color: "#292929",
          }}>
          {props.title}
        </div>
      </td>
    </tr>
    {props.subtitle && (
      <tr>
        <td align="center" style={{ fontSize: 0, padding: "10px 25px", wordBreak: "break-word" }}>
          <div
            style={{
              fontFamily: "Roboto, Helvetica, sans-serif",
              fontSize: 16,
              fontWeight: 400,
              lineHeight: "24px",
              textAlign: "center",
              color: "#494949",
            }}>
            {props.subtitle}
          </div>
        </td>
      </tr>
    )}
  </EmailCommonDivider>
);

export default EmailScheduledBodyHeaderContent;
