import { useEffect } from "react";
import { useState } from "react";
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
        calLink="pro"
        config={{
          name: "John Doe",
          email: "johndoe@gmail.com",
          notes: "Test Meeting",
          guests: ["janedoe@gmail.com"],
          theme: "dark",
        }}></Cal>
      <button data-cal-link="pro">Popup</button>
    </>
  );
}
ReactDom.render(<App></App>, document.getElementById("root"));
