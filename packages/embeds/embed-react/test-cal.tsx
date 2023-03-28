import React, { useEffect, useState } from "react";
import ReactDom from "react-dom";

import Cal, { getCalApi } from "./src/index";

const api = getCalApi();

function App() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // Simulate state change causing config object to change, causing rerender of Cal
    setTimeout(setLoaded.bind(true), 1000);
    const callback = (event) => {
      console.log(event.detail);
    };
    api.then((api) => {
      api("on", {
        action: "*",
        callback,
      });
    });
    return () => {
      api.then((api) => {
        api("off", {
          action: "*",
          callback,
        });
      });
    };
  }, []);
  return (
    <>
      <h1>
        There is <code>Cal</code> component below me
      </h1>
      <Cal
        calOrigin="http://localhost:3000"
        embedJsUrl="//localhost:3000/embed/embed.js"
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
    </>
  );
}
ReactDom.render(<App />, document.getElementById("root"));
