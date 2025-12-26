/* eslint-disable @typescript-eslint/no-explicit-any */
import { localStorage } from "@calcom/lib/webstorage";

/**
 * Clears Crisp-related cookies and localStorage to ensure a new session
 */
function clearCrispStorage() {
  try {
    const cookies = document.cookie.split(";");
    const expireDate = "expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    const { hostname } = window.location;

    cookies.forEach((cookie) => {
      const name = cookie.split("=")[0]?.trim();
      if (name?.toLowerCase().includes("crisp")) {
        document.cookie = `${name}=;${expireDate}`;
        document.cookie = `${name}=;${expireDate};domain=${hostname}`;
        document.cookie = `${name}=;${expireDate};domain=.${hostname}`;
      }
    });

    try {
      // eslint-disable-next-line @calcom/eslint/avoid-web-storage
      Object.keys(window.localStorage).forEach((key) => {
        if (key.toLowerCase().includes("crisp")) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore localStorage errors (e.g., in incognito mode)
    }
  } catch {
    // Ignore storage clearing errors
  }
}

function clearToken() {
  delete window.CRISP_TOKEN_ID;
  window.CRISP_TOKEN_ID = undefined;
}

function resetSessionData() {
  if (!window.$crisp || !Array.isArray(window.$crisp)) return;

  window.$crisp.push(["set", "session:data", [[]]]);
  window.$crisp.push(["set", "session:segments", [[], true]]);
  window.$crisp.push(["do", "session:reset"]);
}

/**
 * Resets the Crisp chat session when user logs out
 * Clears token, storage, and resets session to create a new anonymous session
 */
export function resetCrispSession() {
  if (typeof window === "undefined" || !window.$crisp) return;

  clearToken();
  clearCrispStorage();

  if (!Array.isArray(window.$crisp)) {
    const checkCrispLoaded = setInterval(() => {
      if (Array.isArray(window.$crisp)) {
        clearInterval(checkCrispLoaded);
        clearToken();
        window.$crisp.push(["do", "session:reset"]);
      }
    }, 100);
    setTimeout(() => clearInterval(checkCrispLoaded), 5000);
    return;
  }

  const userFields = ["user:email", "user:nickname", "user:avatar", "user:phone", "user:company"];
  userFields.forEach((field) => window.$crisp.push(["set", field, [""]]));

  resetSessionData();
  [100, 500, 1000].forEach((delay) => {
    setTimeout(() => {
      clearToken();
      clearCrispStorage();
      resetSessionData();
    }, delay);
  });
}
