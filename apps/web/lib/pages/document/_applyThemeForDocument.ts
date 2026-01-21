// Theme application function - will be stringified and injected. So, it must not use anything from the closure
export const applyTheme = () => {
  try {
    // This utility is a replica of @calcom/lib/webstorage.ts but we can reuse it because applyTheme is stringified and injected, so we can't have deps here
    const safeLocalStorage = {
      getItem: (key: string) => {
        try {
          // eslint-disable-next-line @calcom/eslint/avoid-web-storage
          return localStorage.getItem(key);
        } catch (e) {
          return null;
        }
      },
      key: (index: number) => {
        try {
          // eslint-disable-next-line @calcom/eslint/avoid-web-storage
          return localStorage.key(index);
        } catch (e) {
          return null;
        }
      },
      getLength: () => {
        try {
          // eslint-disable-next-line @calcom/eslint/avoid-web-storage
          return localStorage.length;
        } catch (e) {
          return 0;
        }
      },
    };

    const appTheme = safeLocalStorage.getItem("app-theme");
    if (!appTheme) return;

    let bookingTheme: string | null = null;
    let username: string | undefined;
    for (let i = 0; i < safeLocalStorage.getLength(); i++) {
      const key = safeLocalStorage.key(i);
      if (key && key.startsWith("booking-theme:")) {
        bookingTheme = safeLocalStorage.getItem(key);
        username = key.split("booking-theme:")[1];
        break;
      }
    }

    const onReady = () => {
      const isBookingPage = username && window.location.pathname.slice(1).startsWith(username);
      if (document.body) {
        document.body.classList.add(isBookingPage ? bookingTheme || appTheme : appTheme);
      } else {
        requestAnimationFrame(onReady);
      }
    };

    requestAnimationFrame(onReady);
  } catch (e) {
    console.error("Error applying theme:", e);
  }
};

// ToDesktop class application function - will be stringified and injected. So, it must not use anything from the closure
export const applyToDesktopClass = () => {
  try {
    const onReady = () => {
      if (typeof window !== "undefined" && window.calIsDesktopApp && document.documentElement) {
        document.documentElement.classList.add("todesktop");
      } else if (document.documentElement) {
        return;
      } else {
        requestAnimationFrame(onReady);
      }
    };

    requestAnimationFrame(onReady);
  } catch (e) {
    console.error("Error applying todesktop class:", e);
  }
};
