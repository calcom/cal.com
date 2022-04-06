import { IS_PRODUCTION, BASE_URL } from "@lib/config/constants";

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

export const emailSchedulingBodyHeader = (headerType: BodyHeadType): string => {
  const image = getHeadImage(headerType);

  return `
  <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
  <div style="margin:0px auto;max-width:600px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
      <tbody>
        <tr>
          <td style="direction:ltr;font-size:0px;padding:0px;padding-top:40px;text-align:center;">
            <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr></tr></table><![endif]-->
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
  <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
      <tbody>
        <tr>
          <td style="border-left:1px solid #E1E1E1;border-right:1px solid #E1E1E1;border-top:1px solid #E1E1E1;direction:ltr;font-size:0px;padding:30px 20px 0 20px;text-align:center;">
            <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:558px;" ><![endif]-->
            <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                <tbody>
                  <tr>
                    <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                        <tbody>
                          <tr>
                            <td style="width:64px;">
                              <img height="64" src="${image}" style="border:0;display:block;outline:none;text-decoration:none;height:64px;width:100%;font-size:13px;" width="64" />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!--[if mso | IE]></td></tr></table><![endif]-->
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  `;
};
