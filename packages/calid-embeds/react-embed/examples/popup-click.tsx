import { useEffect } from "react";
import * as React from "react";
import ReactDom from "react-dom";
import { getCalApi } from "../src/index";

const POPUP_NS = "element-click";

function ClickDemo() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({
        embedJsUrl: "http://localhost:3000/embed-link/embed.js",
        namespace: POPUP_NS,
      });
      cal("ui", {
        styles: { branding: { brandColor: "#000000" } },
        hideEventTypeDetails: false,
      });
    })();
  }, []);

  return (
    <button
      data-cal-namespace={POPUP_NS}
      data-cal-link="pro"
      data-cal-config='{"layout":"month_view","theme":"dark"}'>
      Click me
    </button>
  );
}

ReactDom.render(<ClickDemo />, document.getElementById("root"));