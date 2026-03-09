import { useEffect } from "react";
import * as React from "react";
import ReactDom from "react-dom";
import { getCalApi } from "../src/index";

function FloatingDemo() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({
        namespace: "floating",
        embedJsUrl: "http://localhost:3000/embed-link/embed.js",
      });
      cal("floatingButton", {
        calLink: "pro",
        calOrigin: "http://localhost:3000",
        config: { theme: "dark" },
      });
      cal("ui", {
        styles: { branding: { brandColor: "#000000" } },
        hideEventTypeDetails: false,
      });
    })();
  }, []);

  return null;
}

ReactDom.render(<FloatingDemo />, document.getElementById("root"));