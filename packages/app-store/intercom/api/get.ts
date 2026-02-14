import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Set Content-Type header to text/html
    res.setHeader("Content-Type", "text/html");

    const url = req.query.url as string;

    if (!url) return res.status(400).json({ message: "Missing URL in query parameters" });

    res.setHeader("Content-Type", "text/html");

    let origin = WEBAPP_URL;
    let calLink = url;

    if (/^https?:\/\//i.test(url)) {
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();

        if (hostname === "cal.com" || hostname.endsWith(".cal.com")) {
          origin = parsedUrl.origin;
          calLink = parsedUrl.pathname + parsedUrl.search;
          if (calLink.startsWith("/")) {
            calLink = calLink.substring(1);
          }
        } else {
          return res.status(400).json({ message: "URL must be for cal.com or a subdomain of cal.com" });
        }
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }
    } else {
      calLink = url.replace(`${WEBAPP_URL}/`, "");
    }

    // Generate HTML with embedded Cal component
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cal.com</title>
          <meta charset="UTF-8" />
          <script src="https://s3.amazonaws.com/intercom-sheets.com/messenger-sheet-library.latest.js"></script>
        </head>

        <body>
          <!-- Cal inline embed code begins -->
          <div style="width: 100%; height: 100%; overflow: auto" id="my-cal-inline"></div>
          <script type="text/javascript">
            (function (C, A, L) {
              let p = function (a, ar) { a.q.push(ar); };
              let d = C.document;
              C.Cal =
                C.Cal ||
                function () {
                  let cal = C.Cal;
                  let ar = arguments;
                  if (!cal.loaded) {
                    cal.ns = {};
                    cal.q = cal.q || [];
                    d.head.appendChild(d.createElement("script")).src = A;
                    cal.loaded = true;
                  }
                  if (ar[0] === L) {
                    const api = function () { p(api, arguments); };
                    const namespace = ar[1];
                    api.q = api.q || [];
                    if (typeof namespace === "string") {
                      cal.ns[namespace] = cal.ns[namespace] || api;
                      p(cal.ns[namespace], ar);
                      p(cal, ["initNamespace", namespace]);
                    } else p(cal, ar);
                    return;
                  }
                  p(cal, ar);
                };
            })(window, "https://app.cal.com/embed/embed.js", "init");

            Cal("init", { origin: "${origin}" });

            Cal("inline", {
              elementOrSelector: "#my-cal-inline",
              calLink: "${calLink}",
              config: {
                theme: "light",
              },
            });
           
           Cal("on", {
              action: "bookingSuccessful",
              callback: (e) => {
                console.log("bookingSuccessful", e)
                try { 
                  INTERCOM_MESSENGER_SHEET_LIBRARY.submitSheet(e.detail.data)
                } catch(error) {
                  console.log("Error Intercom sheet", error)
                }
              }
            });

          </script>
          <!-- Cal inline embed code ends -->
        </body>
      </html>
    `;

    res.status(200).send(htmlResponse);
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
