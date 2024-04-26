import type { GlobalCal } from "./src/embed";

const Cal = window.Cal as GlobalCal;
const callback = function (e) {
  const detail = e.detail;
  console.log("Event: ", e.type, detail);
};

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
  Cal("init", "e2ePrerenderLightTheme", {
    debug: true,
    origin: "http://localhost:3000",
  });
  Cal.ns.e2ePrerenderLightTheme("prerender", {
    calLink: "free/30min",
    type: "modal",
  });
}

if (only === "all" || only === "preload-test") {
  Cal("init", "preloadTest", {
    debug: true,
    origin: "http://localhost:3000",
  });
  Cal.ns.preloadTest("preload", {
    calLink: "free/30min",
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

if (only === "conflicting-theme") {
  Cal("init", "conflictingTheme", {
    debug: true,
    origin: "http://localhost:3000",
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
  origin: "http://localhost:3000",
});

Cal("init", "e2ePopupLightTheme", {
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

Cal("init", "childElementTarget", {
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
  origin: "http://localhost:3000",
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
    origin: "http://localhost:3000",
  });

  Cal.ns.monthView(
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-monthView .place",
      calLink: "pro/paid",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-monthView-iframe",
        },
        layout: "month_view",
      },
    }
  );
  Cal.ns.monthView("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only == "ns:weekView") {
  // Create a namespace "second". It can be accessed as Cal.ns.second with the exact same API as Cal
  Cal("init", "weekView", {
    debug: true,
    origin: "http://localhost:3000",
  });

  Cal.ns.weekView(
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-weekView .place",
      calLink: "pro/paid",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-weekView-iframe",
        },
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
    origin: "http://localhost:3000",
  });

  Cal.ns.columnView(
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    {
      elementOrSelector: "#cal-booking-place-columnView .place",
      calLink: "pro/paid",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-columnView-iframe",
        },
        layout: "column_view",
      },
    }
  );
  Cal.ns.columnView("on", {
    action: "*",
    callback,
  });
}
