/* First make sure that you have installed the package */

/* If you are using yarn */
// yarn add @calcom/embed-react

/* If you are using npm */
// npm install @calcom/embed-react
import { useEffect } from "react";
import * as React from "react";
import ReactDom from "react-dom";

import { getCalApi } from "./src/index";

const calNamespace = "element-click";
function App() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({
        embedJsUrl: "http://localhost:3000/embed/embed.js",
        namespace: calNamespace,
      });
      cal("ui", { styles: { branding: { brandColor: "#000000" } }, hideEventTypeDetails: false });
    })();
  }, []);
  return (
    <button
      data-cal-namespace={calNamespace}
      data-cal-link="pro"
      data-cal-config='{"layout":"month_view", "theme":"dark"}'>
      Click me
    </button>
  );
}

ReactDom.render(<App />, document.getElementById("root"));
