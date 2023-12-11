import * as React from "react";
import { useEffect } from "react";
import ReactDom from "react-dom";

// Because we don't import from @calcom/embed-react, this file isn't able to test if the build is successful or not and thus npm package would work or not correctly.
// There are tests in test/built which verifiy that the types from built package are correctly generated and exported correctly.
import Cal, { getCalApi } from "./src/index";

function App() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal.ns.a("ui", {
        styles: { branding: { brandColor: "#000000" } },
        hideEventTypeDetails: false,
        layout: "week_view",
      });
    })();
  }, []);
  return (
    <>
      <h1>
        There is <code>Cal</code> component below me
      </h1>
      <Cal
        namespace="a"
        calLink="owner/a"
        style={{ width: "100%", height: "100%", overflow: "scroll" }}
        config={{ layout: "month_view" }}
        calOrigin="http://org1.cal.local:3000"
        embedJsUrl="http://localhost:3000/embed/embed.js"
      />
      ;
    </>
  );
}
ReactDom.render(<App />, document.getElementById("root"));
