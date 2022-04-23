import { useEffect } from "react";
import { useState } from "react";
import ReactDom from "react-dom";

import Cal from "./src/index";

function App() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // Simulate state change causing config object to change, causing rerender of Cal
    setTimeout(setLoaded.bind(true), 1000);
  }, []);
  return (
    <>
      <h1>
        There is <code>Cal</code> component below me
      </h1>
      <Cal
        calOrigin="http://localhost:3000"
        embedJsUrl="//localhost:3100/dist/embed.umd.js"
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
