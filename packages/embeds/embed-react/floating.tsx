/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react
import { useEffect } from "react";
import * as React from "react";
import ReactDom from "react-dom";

import { getCalApi } from "./src/index";

function App() {
  useEffect(() => {
    (async function () {
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
