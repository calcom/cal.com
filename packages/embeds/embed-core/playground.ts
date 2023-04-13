import type { GlobalCal, GlobalCalWithoutNs } from "./src/embed";

type A = GlobalCalWithoutNs;
const Cal = window.Cal as GlobalCal;
const callback = function (e) {
  const detail = e.detail;
  console.log("Event: ", e.type, detail);
};

const searchParams = new URL(document.URL).searchParams;
const only = window.only;

if (only === "all" || only === "ns:default") {
  Cal("init", {
    debug: true,
    calOrigin: "http://localhost:3000",
  });

  Cal("inline", {
    elementOrSelector: "#cal-booking-place-default .place",
    calLink: "pro?case=1",
    config: {
      iframeAttrs: {
        id: "cal-booking-place-default-iframe",
      },
      name: "John",
      email: "johndoe@gmail.com",
      notes: "Test Meeting",
      guests: ["janedoe@example.com", "test@example.com"],
      theme: "dark",
    },
  });
  Cal("on", {
    action: "*",
    callback,
  });
}
if (only === "all" || only === "ns:second") {
  // Create a namespace "second". It can be accessed as Cal.ns.second with the exact same API as Cal
  Cal("init", "second", {
    debug: true,
    origin: "http://localhost:3000",
  });

  // Bulk API is supported - Keep all configuration at one place.
  // Not able to type Bulk Api correctly when the first argument itself is an array.
  Cal.ns.second([
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-second .place",
      calLink: "pro?case=2",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-second-iframe",
        },
      },
    },
  ]);
  Cal.ns.second("on", {
    action: "*",
    callback,
  });
}
if (only === "all" || only === "ns:third") {
  // Create a namespace "third". It can be accessed as Cal.ns.second with the exact same API as Cal
  Cal("init", "third", {
    debug: true,
    origin: "http://localhost:3000",
  });

  Cal.ns.third(
    [
      "inline",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      {
        elementOrSelector: "#cal-booking-place-third .place",
        calLink: "pro/30min",
        config: {
          iframeAttrs: {
            id: "cal-booking-place-third-iframe",
          },
        },
      },
    ],
    [
      "ui",
      {
        styles: {
          body: {
            background: "transparent",
          },
          branding: {
            brandColor: "#81e61c",
            lightColor: "#494545",
            lighterColor: "#4c4848",
            lightestColor: "#7c7777",
            highlightColor: "#9b0e0e",
            medianColor: "black",
          },
          enabledDateButton: {
            backgroundColor: "red",
          },
          disabledDateButton: {
            backgroundColor: "green",
          },
        },
      },
    ]
  );
  Cal.ns.third("on", {
    action: "*",
    callback,
  });
}
if (only === "all" || only === "ns:fourth") {
  Cal("init", "fourth", {
    debug: true,
    origin: "http://localhost:3000",
  });
  Cal.ns.fourth(
    [
      "inline",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      {
        elementOrSelector: "#cal-booking-place-fourth .place",
        calLink: "team/seeded-team",
        config: {
          iframeAttrs: {
            id: "cal-booking-place-fourth-iframe",
          },
        },
      },
    ],
    [
      "ui",
      {
        styles: {
          body: {
            background: "transparent",
          },
          branding: {
            brandColor: "#81e61c",
            lightColor: "#494545",
            lighterColor: "#4c4848",
            lightestColor: "#7c7777",
            highlightColor: "#9b0e0e",
            medianColor: "black",
          },
        },
      },
    ]
  );
  Cal.ns.fourth("on", {
    action: "*",
    callback,
  });
}
if (only === "all" || only === "ns:fifth") {
  Cal("init", "fifth", {
    debug: true,
    origin: "http://localhost:3000",
  });
  Cal.ns.fifth([
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-fifth .place",
      calLink: "team/seeded-team/collective-seeded-team-event",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-fifth-iframe",
        },
      },
    },
  ]);
  Cal.ns.fifth("on", {
    action: "*",
    callback,
  });
}
if (only === "all" || only === "prerender-test") {
  Cal("init", "prerendertestLightTheme", {
    debug: true,
    origin: "http://localhost:3000",
  });
  Cal.ns.prerendertestLightTheme("preload", {
    calLink: "free",
  });
}

if (only === "all" || only === "inline-routing-form") {
  Cal("init", "inline-routing-form", {
    debug: true,
    origin: "http://localhost:3000",
  });
  Cal.ns["inline-routing-form"]([
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-inline-routing-form .place",
      calLink: "forms/948ae412-d995-4865-875a-48302588de03",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-inline-routing-form-iframe",
        },
      },
    },
  ]);
}

if (only === "all" || only === "hideEventTypeDetails") {
  const identifier = "hideEventTypeDetails";
  Cal("init", identifier, {
    debug: true,
    origin: "http://localhost:3000",
  });

  Cal.ns.hideEventTypeDetails(
    [
      "inline",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      {
        elementOrSelector: `#cal-booking-place-${identifier} .place`,
        calLink: "free/30min",
        config: {
          iframeAttrs: {
            id: `cal-booking-place-${identifier}-iframe`,
          },
        },
      },
    ],
    [
      "ui",
      {
        hideEventTypeDetails: true,
      },
    ]
  );
}

Cal("init", "popupDarkTheme", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal("init", "popupHideEventTypeDetails", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal.ns.popupHideEventTypeDetails("ui", {
  hideEventTypeDetails: true,
});

Cal("init", "popupReschedule", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal("init", "popupAutoTheme", {
  debug: true,
  origin: "http://localhost:3000",
});
Cal("init", "popupTeamLinkLightTheme", {
  debug: true,
  origin: "http://localhost:3000",
});
Cal("init", "popupTeamLinkDarkTheme", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal("init", "popupTeamLinkDarkTheme", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal("init", "popupTeamLinksList", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal("init", "popupPaidEvent", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal("init", "floatingButton", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal("init", "routingFormAuto", {
  debug: true,
  origin: "http://localhost:3000",
});

Cal("init", "routingFormDark", {
  debug: true,
  origin: "http://localhost:3000",
});

if (only === "all" || only == "ns:floatingButton") {
  Cal.ns.floatingButton("floatingButton", {
    calLink: "pro",
  });
}
