import * as React from "react";
import { useEffect, useState } from "react";
import ReactDom from "react-dom";
import Cal, { getCalApi, type EmbedEvent } from "../src/index";

const pendingApi = getCalApi({ namespace: "inline" });

function InlineDemo() {
  const [, triggerRerender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => triggerRerender(true), 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wildcardHandler = (event: any) => {
      console.log(event.detail);
    };

    pendingApi.then((api) => {
      api("on", { action: "*", callback: wildcardHandler });
      api("ui", {
        cssVarsPerTheme: {
          light: { "cal-border-booker": "red", "cal-border-booker-width": "20px" },
          dark: { "cal-border-booker": "red", "cal-border-booker-width": "5px" },
        },
      });
    });

    return () => {
      clearTimeout(timer);
      pendingApi.then((api) => {
        api("off", { action: "*", callback: wildcardHandler });

        const onceBookingV2 = (e: EmbedEvent<"bookingSuccessfulV2">) => {
          const { endTime, startTime, title } = e.detail.data;
          console.log("bookingSuccessfulV2", { endTime, startTime, title });
          api("off", { action: "bookingSuccessfulV2", callback: onceBookingV2 });
        };

        api("on", { action: "bookingSuccessfulV2", callback: onceBookingV2 });
      });
    };
  }, []);

  return (
    <>
      <h1>
        There is a <code>Cal</code> component below me
      </h1>
      <Cal
        calOrigin="http://localhost:3000"
        embedJsUrl="//localhost:3000/embed-link/embed.js"
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
        }}
      />
    </>
  );
}

ReactDom.render(<InlineDemo />, document.getElementById("root"));