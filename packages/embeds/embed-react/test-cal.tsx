import ReactDom from "react-dom";

import Cal from "@calcom/embed-react";

function App() {
  return (
    <>
      <h1>
        There is <code>Cal</code> component below me
      </h1>
      <Cal
        embedJsUrl="//localhost:3002/dist/embed.umd.js"
        calLink="pro"
        config={{
          name: "John Doe",
          email: "johndoe@gmail.com",
          notes: "Test Meeting",
          guests: ["janedoe@gmail.com"],
          theme: "dark",
        }}></Cal>
    </>
  );
}
ReactDom.render(<App></App>, document.getElementById("root"));
