/* eslint-disable @next/next/no-head-element */
import { WEBAPP_URL } from "@calcom/lib/constants";

import RawHtml from "./RawHtml";

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const Html = (props: { children: React.ReactNode }) => (
  <>
    <RawHtml html="<!doctype html>" />
    <html>{props.children}</html>
  </>
);

const EmailHead = ({ title }: { title: string }) => (
  <head>
    <title>{title}</title>
    <RawHtml
      html={`<!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->`}
    />
    <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type="text/css">
      {`
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        p { display: block; margin: 0; }
        a { color: #27272a; text-decoration: none; }
      `}
    </style>
    <RawHtml html="<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->" />
  </head>
);

export interface CossBaseEmailHtmlProps {
  subject: string;
  children: React.ReactNode;
}

export const CossBaseEmailHtml = ({ subject, children }: CossBaseEmailHtmlProps) => {
  const logoImage = `${WEBAPP_URL}/emails/logo.png`;

  return (
    <Html>
      <EmailHead title={subject} />
      <body
        style={{
          wordSpacing: "normal",
          backgroundColor: "#f4f4f5",
          margin: 0,
          padding: 0,
          fontFamily: FONT_STACK,
        }}>
        <div style={{ backgroundColor: "#f4f4f5", padding: "40px 16px" }}>
          {/* Logo */}
          <table
            role="presentation"
            cellPadding="0"
            cellSpacing="0"
            style={{ margin: "0 auto", maxWidth: 520, width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ padding: "0 0 24px", textAlign: "center" }}>
                  <a href={WEBAPP_URL} target="_blank" rel="noreferrer">
                    <img
                      src={logoImage}
                      alt="Cal.com"
                      height="19"
                      width="89"
                      style={{
                        border: 0,
                        display: "inline-block",
                        outline: "none",
                        textDecoration: "none",
                        height: "19px",
                        width: "89px",
                      }}
                    />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Card */}
          <table
            role="presentation"
            cellPadding="0"
            cellSpacing="0"
            style={{ margin: "0 auto", maxWidth: 520, width: "100%" }}>
            <tbody>
              <tr>
                <td
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "16px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.03)",
                    padding: "32px 28px",
                    fontFamily: FONT_STACK,
                    fontSize: "15px",
                    lineHeight: "1.6",
                    color: "#27272a",
                  }}>
                  {children}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <table
            role="presentation"
            cellPadding="0"
            cellSpacing="0"
            style={{ margin: "0 auto", maxWidth: 520, width: "100%" }}>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "24px 0 0",
                    textAlign: "center",
                    fontFamily: FONT_STACK,
                    fontSize: "12px",
                    color: "#a1a1aa",
                  }}>
                  <a
                    href={WEBAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#a1a1aa", textDecoration: "none" }}>
                    Cal.com
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
    </Html>
  );
};
