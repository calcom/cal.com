import type { EmbedEvent, GlobalCal } from "../../src/embed";

const Cal = window.Cal as GlobalCal;
Cal.config = Cal.config || {};
Cal.config.forwardQueryParams = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callback = (e: any) => {
  const detail = e.detail;
};

// @ts-expect-error  window.calOrigin is set in index.html
const origin = `${new URL(document.URL).protocol}//${window.calOrigin.split("//")[1]}`;
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

function fakeEvent({ namespace, eventType, data }) {
  window.postMessage({
    fullType: `CAL:${namespace}:${eventType}`,
    namespace,
    originator: "CAL",
    type: eventType,
    data,
  });
}

window.heavilyCustomizeUi = ({ namespace }) => {
  Cal.ns[namespace]("ui", {
    theme: "light",
    cssVarsPerTheme: {
      light: {
        "cal-brand": "#6F61C0",
        "cal-text": "#6F61C0",
        "cal-text-emphasis": "#4D408D",
        "cal-border-emphasis": "#4D408D",
        "cal-text-error": "pink",
        "cal-border": "#A090E0",
        "cal-border-default": "#A090E0",
        "cal-border-subtle": "#A090E0",
        "cal-border-booker": "red",
        "cal-text-muted": "#C0B8FF",
        "cal-bg-emphasis": "#E1DFFF",
        "cal-border-booker-width": "3px",
        "cal-radius": "1px",
        "cal-radius-md": "2px",
        "cal-radius-lg": "3px",
        "cal-radius-xl": "4px",
        "cal-radius-2xl": "5px",
        "cal-radius-3xl": "6px",
        "cal-radius-full": "7px",
        "cal-spacing-px": "5px",
        // More CSS variables are defined here
        // https://github.com/calcom/cal.com/blob/main/packages/config/tailwind-preset.js
      },
      dark: {
        // Set the similar variables as in light theme but for dark mode.
      },
    },
  });
};

window.fakeErrorScenario = ({ namespace }) => {
  fakeEvent({
    namespace,
    eventType: "linkFailed",
    data: { code: 500 },
  });
};

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
    //@ts-expect-error
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
      //@ts-expect-error
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
      //@ts-expect-error
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
    //@ts-expect-error
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
    //@ts-expect-error
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
    //@ts-expect-error
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

if (only === "all" || only === "ns:hideEventTypeDetails") {
  const identifier = "hideEventTypeDetails";
  Cal("init", identifier, {
    debug: true,
    origin: origin,
  });

  Cal.ns.hideEventTypeDetails(
    [
      "inline",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
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

Cal("init", "popupCancelBooking", {
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
    //@ts-expect-error
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
    //@ts-expect-error
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
    //@ts-expect-error
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

if (only === "all" || only == "ns:twoStepSlotSelection") {
  Cal("init", "twoStepSlotSelection", {
    debug: true,
    origin: origin,
  });

  Cal.ns.twoStepSlotSelection(
    "inline",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    {
      elementOrSelector: "#cal-booking-place-twoStepSlotSelection .place",
      calLink: "free/30min",
      config: {
        iframeAttrs: {
          id: "cal-booking-place-twoStepSlotSelection-iframe",
        },
        "flag.coep": "true",
        name: "John",
        email: "john@booker.com",
        notes: ["test"],
        guests: ["guest@example.com"],
        useSlotsViewOnSmallScreen: "true",
      },
    }
  );

  Cal.ns.twoStepSlotSelection("on", {
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
    //@ts-expect-error
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

const bookerReadyCallback = (e: EmbedEvent<"bookerReady">) => {
  const data = e.detail.data;
  console.log("bookerReady", {
    eventId: data.eventId,
    eventSlug: data.eventSlug,
  });

  Cal("off", {
    action: "bookerReady",
    callback: bookerReadyCallback,
  });
};

Cal("on", {
  action: "bookerReady",
  callback: bookerReadyCallback,
});

if (only === "all" || only === "ns:skeletonDemo") {
  Cal("init", "skeletonDemo", {
    debug: true,
    origin: origin,
  });

  // Example showing booking page skeleton
  Cal.ns.skeletonDemo("inline", {
    elementOrSelector: "#cal-booking-place-skeletonDemo .place",
    calLink: "pro/30min",
    config: {
      theme: "auto",
      iframeAttrs: {
        id: "cal-booking-place-skeletonDemo-iframe",
      },
      "flag.coep": "true",
      "cal.embed.pageType": "user.event.booking.slots",
    },
  });

  Cal.ns.skeletonDemo("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only === "ns:skeletonDemoElementClick") {
  Cal("init", "skeletonDemoElementClick", {
    debug: true,
    origin: origin,
  });

  Cal.ns.skeletonDemoElementClick("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only === "ns:routingFormPrerender") {
  Cal("init", "routingFormPrerender", {
    debug: true,
    origin,
  });

  Cal.ns.routingFormPrerender("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only === "ns:routingFormWithoutPrerender") {
  Cal("init", "routingFormWithoutPrerender", {
    debug: true,
    origin,
  });

  Cal.ns.routingFormWithoutPrerender("on", {
    action: "*",
    callback,
  });
}

if (only === "all" || only === "ns:containerScrollToTimeslot") {
  Cal("init", "containerScrollToTimeslot", {
    debug: true,
    origin,
  });
  Cal.ns.containerScrollToTimeslot("inline", {
    elementOrSelector: "#cal-booking-place-containerScrollToTimeslot .place",
    calLink: "free/30min",
    config: {
      iframeAttrs: {
        id: "cal-booking-place-containerScrollToTimeslot-iframe",
      },
      "flag.coep": "true",
    },
  });
}

if (only === "all" || only === "ns:windowScrollToTimeslot") {
  Cal("init", "windowScrollToTimeslot", {
    debug: true,
    origin,
  });
  Cal.ns.windowScrollToTimeslot("inline", {
    elementOrSelector: "#cal-booking-place-windowScrollToTimeslot .place",
    calLink: "free/30min",
    config: {
      iframeAttrs: {
        id: "cal-booking-place-windowScrollToTimeslot-iframe",
      },
      "flag.coep": "true",
    },
  });
}

// Keep it at the bottom as it works on the API defined above for various cases
(function ensureScrolledToCorrectIframe() {
  // Reset the hash so that we can scroll to correct iframe
  // Also, even if we need to scroll to the same iframe, we need to still reset it otherwise hashchange event will not fire
  location.hash = "";
  let api: typeof Cal | (typeof Cal)["ns"][string] | null = null;

  const getNamespace = () => {
    const url = new URL(document.URL);
    const only = url.searchParams.get("only") || "";
    return only !== "all" ? only.replace("ns:", "") : null;
  };

  const updateApiOnNamespaceChange = () => {
    const namespace = getNamespace();
    api = namespace && namespace !== "default" ? Cal.ns[namespace] : Cal;
    api?.("on", {
      action: "*",
      callback: (e) => {
        function scrollToIframeInPlayground() {
          const namespace = getNamespace();
          if (namespace) {
            location.hash = `#cal-booking-place-${namespace}-iframe`;
          }
        }
        scrollToIframeInPlayground();
      },
    });
  };

  // Initial namespace setup
  updateApiOnNamespaceChange();

  // Update namespace on hash change
  window.addEventListener("hashchange", updateApiOnNamespaceChange);
})();
