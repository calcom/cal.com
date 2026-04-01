/**
 * @fileoverview This file is an example file and tells how to use the element-click popup embed in a React application. This is also used by playwright e2e
 */
import { useEffect } from "react";
import * as React from "react";
import ReactDom from "react-dom";

import { getCalApi } from "./src/index";

const url = new URL(document.URL);
const calOrigin = url.searchParams.get("calOrigin") || "http://localhost:3000";

const calNamespace = "element-click";
function App() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({
        embedJsUrl: `${calOrigin}/embed/embed.js`,
        namespace: calNamespace,
      });
      cal("ui", {
        styles: { branding: { brandColor: "#000000" } },
        hideEventTypeDetails: false,
      });
    })();
  }, []);
  return (
    <button
      data-cal-namespace={calNamespace}
      data-cal-link="pro"
      data-cal-config='{"layout":"month_view", "theme":"dark", "useSlotsViewOnSmallScreen":"true"}'
    >
      Click me
    </button>
  );
}

ReactDom.render(<App />, document.getElementById("root"));
