import { WEBAPP_URL } from "@calcom/lib/constants";

const EmailBodyLogo = () => {
  const image = `${WEBAPP_URL}/sunset-logo.png`;

  return (
    <div style={{ margin: "0 auto", maxWidth: "600px" }}>
      <table
        role="presentation"
        cellPadding="0"
        cellSpacing="0"
        style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td align="center" style={{ padding: "28px 25px 6px 25px" }}>
              <img
                src={image}
                alt="Sunset Services U.S."
                width="200"
                style={{
                  display: "block",
                  margin: "0 auto",
                  width: "200px",
                  maxWidth: "70%",
                  height: "auto",
                  border: "0",
                  outline: "none",
                  textDecoration: "none",
                }}
              />
            </td>
          </tr>
          <tr>
            <td
              align="center"
              style={{
                padding: "0 25px 16px 25px",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "13px",
                letterSpacing: "2px",
                color: "#8C8C8C",
              }}>
              Craft Your Outdoor Legacy
            </td>
          </tr>
          <tr>
            <td style={{ padding: 0 }}>
              <div
                style={{
                  height: "3px",
                  lineHeight: "3px",
                  fontSize: "1px",
                  backgroundColor: "#F28C38",
                }}>
                {"\u00A0"}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default EmailBodyLogo;
