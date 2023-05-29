import * as React from "react";
import { useEffect } from "react";
import { useState } from "react";
import ReactDom from "react-dom";

// Because we don't import from @calcom/embed-react, this file isn't able to test if the build is successful or not and thus npm package would work or not correctly.
// There are tests in test/built which verifiy that the types from built package are correctly generated and exported correctly.
import Cal, { getCalApi } from "./src/index";

const api = getCalApi();

function App() {
  const [, setLoaded] = useState(false);
  useEffect(() => {
    // Simulate state change causing config object to change, causing rerender of Cal
    setTimeout(setLoaded.bind(true), 1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callback = (event: any) => {
      console.log(event.detail);
    };
    api.then((api) => {
      api("on", {
        action: "*",
        callback,
      });

      api("ui", {
        cssVarsPerTheme: {
          light: {
            "cal-border-booker": "red",
            "cal-border-booker-width": "20px",
          },
          dark: {
            "cal-border-booker": "red",
            "cal-border-booker-width": "5px",
          },
        },
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
    </>
  );
}
ReactDom.render(<App />, document.getElementById("root"));
