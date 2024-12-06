import type { GlobalCal, EmbedEvent } from "./src/embed";

const Cal = window.Cal as GlobalCal;
Cal.config = Cal.config || {};
Cal.config.forwardQueryParams = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callback = function (e: any) {
  const detail = e.detail;
  console.log("Event: ", e.type, detail);
};

const origin = `${new URL(document.URL).protocol}localhost:3000`;
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if ("href" in target && typeof target.href === "string") {
    const toUrl = new URL(target.href);
    const pageUrl = new URL(document.URL);
    for (const [name, value] of pageUrl.searchParams.entries()) {
      if (toUrl.searchParams.get(name) === null) {
        toUrl.searchParams.append(decodeURIComponent(name), value);
      }
    }
    location.href = `?${toUrl.searchParams.toString()}#${toUrl.hash}`;
    e.preventDefault();
  }
});

const searchParams = new URL(document.URL).searchParams;
const only = searchParams.get("only");
const colorScheme = searchParams.get("color-scheme");
const prerender = searchParams.get("prerender");

// @ts-expect-error We haven't defined ENABLE_FUTURE_ROUTES as it is a playground specific variable.
window.ENABLE_FUTURE_ROUTES = searchParams.get("future-routes") === "true";

if (colorScheme) {
  document.documentElement.style.colorScheme = colorScheme;
}
const themeInParam = searchParams.get("theme");
const validThemes = ["light", "dark", "auto"] as const;
const theme = validThemes.includes((themeInParam as (typeof validThemes)[number]) || "")
  ? (themeInParam as (typeof validThemes)[number])
  : null;
if (themeInParam && !theme) {
  throw new Error(`Invalid theme: ${themeInParam}`);
}

const calLink = searchParams.get("cal-link");

if (only === "all" || only === "ns:default") {
  Cal("init", {
    debug: true,
    calOrigin: origin,
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
      "flag.coep": "true",
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
    origin: origin,
  });

  Cal.ns.second(
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
        theme: "auto",
        "flag.coep": "true",
      },
    }
  );
  Cal.ns.second("on", {
    action: "*",
    callback,
  });
}
if (only === "all" || only === "ns:third") {
  // Create a namespace "third". It can be accessed as Cal.ns.second with the exact same API as Cal
  Cal("init", "third", {
    debug: true,
    origin: origin,
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
          "flag.coep": "true",
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
    origin: origin,
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
          "flag.coep": "true",
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

if (only === "all" || only === "ns:corpTest") {
  Cal("init", "corpTest", {
    debug: true,
    origin: "http://localhost:3000",
  });
  Cal.ns.corpTest([
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-corpTest .place",
      calLink: "pro",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-corpTest-iframe",
        },
        "flag.coep": "false",
      },
    },
  ]);
}
if (only === "all" || only === "ns:fifth") {
  Cal("init", "fifth", {
    debug: true,
    origin: origin,
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
        "flag.coep": "true",
      },
    },
  ]);
  Cal.ns.fifth("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only === "prerender-test") {
  Cal("init", "e2ePrerenderLightTheme", {
    debug: true,
    origin: origin,
  });
  Cal.ns.e2ePrerenderLightTheme("prerender", {
    calLink: "free/30min?flag.coep=true",
    type: "modal",
  });
}

if (only === "all" || only === "preload-test") {
  Cal("init", "preloadTest", {
    debug: true,
    origin: origin,
  });
  Cal.ns.preloadTest("preload", {
    calLink: "free/30min",
  });
}

if (only === "all" || only === "inline-routing-form") {
  Cal("init", "inline-routing-form", {
    debug: true,
    origin: origin,
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
        "flag.coep": "true",
      },
    },
  ]);
}

if (only === "all" || only === "hideEventTypeDetails") {
  const identifier = "hideEventTypeDetails";
  Cal("init", identifier, {
    debug: true,
    origin: origin,
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
          "flag.coep": "true",
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

if (only === "conflicting-theme") {
  Cal("init", "conflictingTheme", {
    debug: true,
    origin: origin,
  });

  Cal.ns.conflictingTheme("inline", {
    elementOrSelector: "#cal-booking-place-conflicting-theme .dark",
    calLink: "pro/30min",
    config: {
      theme: "dark",
    },
  });
  Cal.ns.conflictingTheme("inline", {
    elementOrSelector: "#cal-booking-place-conflicting-theme .light",
    calLink: "pro/30min",
    config: {
      theme: "light",
    },
  });
}

Cal("init", "popupDarkTheme", {
  debug: true,
  origin: origin,
});

Cal("init", "e2ePopupLightTheme", {
  debug: true,
  origin: origin,
});

Cal("init", "popupHideEventTypeDetails", {
  debug: true,
  origin: origin,
});

Cal.ns.popupHideEventTypeDetails("ui", {
  hideEventTypeDetails: true,
});

Cal("init", "popupRescheduleWithReschedulePath", {
  debug: true,
  origin: origin,
});

Cal("init", "popupRescheduleWithRescheduleUidParam", {
  debug: true,
  origin: origin,
});

Cal("init", "popupAutoTheme", {
  debug: true,
  origin: origin,
});

Cal("init", "popupTeamLinkLightTheme", {
  debug: true,
  origin: origin,
});

Cal("init", "popupTeamLinkDarkTheme", {
  debug: true,
  origin: origin,
});

Cal("init", "popupTeamLinkDarkTheme", {
  debug: true,
  origin: origin,
});

Cal("init", "popupTeamLinksList", {
  debug: true,
  origin: origin,
});

Cal("init", "popupPaidEvent", {
  debug: true,
  origin: origin,
});

Cal("init", "childElementTarget", {
  debug: true,
  origin: origin,
});

Cal("init", "floatingButton", {
  debug: true,
  origin: origin,
});

Cal("init", "routingFormAuto", {
  debug: true,
  origin: origin,
});

Cal("init", "routingFormHeadlessRouter", {
  debug: true,
  origin: origin,
});

Cal.ns.routingFormAuto("on", {
  action: "routed",
  callback: (e) => {
    const detail = e.detail;
    console.log("`routed` event data:", detail.data);
    alert(`Routing Done - Check console for 'routed' event data`);
  },
});

Cal("init", "routingFormDark", {
  debug: true,
  origin: origin,
});

if (only === "all" || only == "ns:floatingButton") {
  if (prerender == "true") {
    Cal.ns.floatingButton("prerender", {
      calLink: calLink || "pro",
      type: "floatingButton",
    });
  }
  Cal.ns.floatingButton("floatingButton", {
    calLink: calLink || "pro",
    config: {
      iframeAttrs: {
        id: "floatingtest",
      },
      "flag.coep": "true",
      name: "John",
      email: "johndoe@gmail.com",
      notes: "Test Meeting",
      guests: ["janedoe@example.com", "test@example.com"],
      ...(theme ? { theme } : {}),
    },
  });
}

if (only === "all" || only == "ns:monthView") {
  // Create a namespace "second". It can be accessed as Cal.ns.second with the exact same API as Cal
  Cal("init", "monthView", {
    debug: true,
    origin: origin,
  });

  Cal.ns.monthView(
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-monthView .place",
      calLink: "free/30min",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-monthView-iframe",
        },
        "flag.coep": "true",
        layout: "month_view",
      },
    }
  );
}

if (only === "all" || only == "ns:weekView") {
  // Create a namespace "second". It can be accessed as Cal.ns.second with the exact same API as Cal
  Cal("init", "weekView", {
    debug: true,
    origin: origin,
  });

  Cal.ns.weekView(
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-weekView .place",
      calLink: "free/30min",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-weekView-iframe",
        },
        "flag.coep": "true",
        layout: "week_view",
      },
    }
  );
  Cal.ns.weekView("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only == "ns:columnView") {
  // Create a namespace "second". It can be accessed as Cal.ns.second with the exact same API as Cal
  Cal("init", "columnView", {
    debug: true,
    origin: origin,
  });

  Cal.ns.columnView(
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-columnView .place",
      calLink: "free/30min",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-columnView-iframe",
        },
        "flag.coep": "true",
        layout: "column_view",
      },
    }
  );

  Cal.ns.columnView("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only == "ns:columnViewHideEventTypeDetails") {
  // Create a namespace "second". It can be accessed as Cal.ns.second with the exact same API as Cal
  Cal("init", "columnViewHideEventTypeDetails", {
    debug: true,
    origin: origin,
  });

  Cal.ns.columnViewHideEventTypeDetails(
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-columnViewHideEventTypeDetails .place",
      calLink: "free/30min",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-columnView-iframe",
        },
        "flag.coep": "true",
        layout: "column_view",
      },
    }
  );

  Cal.ns.columnViewHideEventTypeDetails("ui", {
    hideEventTypeDetails: true,
  });

  Cal.ns.columnViewHideEventTypeDetails("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only == "ns:autoScrollTest") {
  if (!calLink) {
    throw new Error("cal-link parameter is required for autoScrollTest");
  }
  Cal("init", "autoScrollTest", {
    debug: true,
    origin: origin,
  });
  Cal.ns.autoScrollTest("inline", {
    elementOrSelector: "#cal-booking-place-autoScrollTest .place",
    calLink: calLink,
    config: {
      "flag.coep": "true",
    },
  });
}

if (only === "all" || only == "ns:pageParamsForwarding") {
  Cal("init", "pageParamsForwarding", {
    debug: true,
    origin: origin,
  });

  Cal.ns.pageParamsForwarding("inline", {
    elementOrSelector: "#cal-booking-place-pageParamsForwarding .place",
    calLink: "pro/paid?embedType=inline&month=2024-08&date=2024-08-26&slot=2024-08-26T14%3A00%3A00.000Z",
    config: {
      iframeAttrs: {
        id: "cal-booking-place-pageParamsForwarding-iframe",
      },
      "flag.coep": "true",
    },
  });
}

// Verifies that the type of e.detail.data is valid. type-check will fail if we accidentally break it.
const bookingSuccessfulV2Callback = (e: EmbedEvent<"bookingSuccessfulV2">) => {
  const data = e.detail.data;
  console.log("bookingSuccessfulV2", {
    endTime: data.endTime,
    startTime: data.startTime,
    title: data.title,
  });

  // Remove the event listener after it is fired once
  Cal("off", {
    action: "bookingSuccessfulV2",
    callback: bookingSuccessfulV2Callback,
  });
};

Cal("on", {
  action: "bookingSuccessfulV2",
  callback: bookingSuccessfulV2Callback,
});
