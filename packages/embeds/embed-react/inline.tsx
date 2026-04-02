/**
 * @fileoverview This file is an example file and tells how to use the Cal component in a React application. This is also used by playwright e2e
 */
import * as React from "react";
import { useEffect, useState } from "react";
import ReactDom from "react-dom";
// Because we don't import from @calcom/embed-react, this file isn't able to test if the build is successful or not and thus npm package would work or not correctly.
// There are tests in test/built which verify that the types from built package are correctly generated and exported correctly.
import Cal, { type EmbedEvent, getCalApi } from "./src/index";

const api = getCalApi({
  namespace: "inline",
});

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

        const bookerReadyCallback = (e: EmbedEvent<"bookerReady">) => {
          const data = e.detail.data;
          console.log("bookerReady", {
            eventId: data.eventId,
            eventSlug: data.eventSlug,
          });

          api("off", {
            action: "bookerReady",
            callback: bookerReadyCallback,
          });
        };

        api("on", {
          action: "bookerReady",
          callback: bookerReadyCallback,
        });

        // Also, validates the type of e.detail.data as TS runs on this file
        const bookingSuccessfulV2Callback = (e: EmbedEvent<"bookingSuccessfulV2">) => {
          const data = e.detail.data;
          console.log("bookingSuccessfulV2", {
            endTime: data.endTime,
            startTime: data.startTime,
            title: data.title,
          });

          // Remove the event listener after it is fired once as I don't need it.
          api("off", {
            action: "bookingSuccessfulV2",
            callback: bookingSuccessfulV2Callback,
          });
        };

        api("on", {
          action: "bookingSuccessfulV2",
          callback: bookingSuccessfulV2Callback,
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
        namespace="inline"
        style={{ width: "100%", height: "100%", overflow: "scroll" }}
        calLink="pro"
        config={{
          name: "John Doe",
          email: "johndoe@gmail.com",
          notes: "Test Meeting",
          guests: ["janedoe@gmail.com"],
          theme: "dark",
          "cal.embed.pageType": "user.event.booking.slots",
          useSlotsViewOnSmallScreen: "true",
        }}
      />
    </>
  );
}
ReactDom.render(<App />, document.getElementById("root"));
