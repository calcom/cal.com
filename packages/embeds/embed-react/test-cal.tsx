import * as React from "react";
import { useEffect, useState } from "react";
import ReactDom from "react-dom";

import Cal, { CalProvider, getCalApi, useCalApi } from "./src/index";

function App() {
  const [loaded, setLoaded] = useState(false);
  const [api] = useCalApi();
  useEffect(() => {
    // Simulate state change causing config object to change, causing rerender of Cal
    setTimeout(setLoaded.bind(true), 1000);
    const callback = (event) => {
      console.log(event.detail);
    };

    if (api != null) {
      api("on", {
        action: "*",
        callback,
      });
    }

    return () => {
      if (api != null) {
        api("off", {
          action: "*",
          callback,
        });
      }
    };
  }, [api]);

  return (
    <CalProvider embedJsUrl="//localhost:3000/embed/embed.js">
      <h1>
        There is <code>Cal</code> component below me
      </h1>

      <Cal
        calOrigin="http://localhost:3000"
        style={{ width: "100%", height: "100%", overflow: "scroll" }}
        calLink="pro"
        config={{
          name: "John Doe",
          email: "johndoe@gmail.com",
          notes: "Test Meeting",
          guests: ["janedoe@gmail.com"],
          theme: "dark",
        }}
      />
      <button data-cal-link="pro">Popup</button>
    </CalProvider>
  );
}
ReactDom.render(<App />, document.getElementById("root"));
