/**
 * @fileoverview This file is an example file and tells how to use floating popup button in a React application. This is also used by playwright e2e
 */

import * as React from "react";
import { useEffect } from "react";
import ReactDom from "react-dom";
import { getCalApi } from "./src/index";

function App() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({
        namespace: "floating",
        embedJsUrl: "http://localhost:3000/embed/embed.js",
      });
      cal("floatingButton", {
        calLink: "pro",
        calOrigin: "http://localhost:3000",
        config: {
          theme: "dark",
        },
      });
      cal("ui", { styles: { branding: { brandColor: "#000000" } }, hideEventTypeDetails: false });
    })();
  }, []);
  return null;
}

ReactDom.render(<App />, document.getElementById("root"));
