import type { Page } from "@playwright/test";

export const createEmbedsFixture = (page: Page) => {
  return async (calNamespace: string) => {
    await page.addInitScript(
      ({ calNamespace }: { calNamespace: string }) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        window.eventsFiredStoreForPlaywright = window.eventsFiredStoreForPlaywright || {};
        document.addEventListener("DOMContentLoaded", function tryAddingListener() {
          if (parent !== window) {
            // Firefox seems to execute this snippet for iframe as well. Avoid that. It must be executed only for parent frame.

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            window.initialBodyVisibility = document.body.style.visibility;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            window.initialBodyBackground = document.body.style.background;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            window.initialValuesSet = true;

            return;
          }

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          let api = window.Cal;

          if (!api) {
            setTimeout(tryAddingListener, 500);
            return;
          }
          if (calNamespace) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            api = window.Cal.ns[calNamespace];
          }
          console.log("PlaywrightTest:", "Adding listener for __iframeReady");
          if (!api) {
            throw new Error(`namespace "${calNamespace}" not found`);
          }
          api("on", {
            action: "*",
            callback: (e) => {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              window.iframeReady = true; // Technically if there are multiple cal embeds, it can be set due to some other iframe. But it works for now. Improve it when it doesn't work

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              const store = window.eventsFiredStoreForPlaywright;
              const eventStore = (store[`${e.detail.type}-${e.detail.namespace}`] =
                store[`${e.detail.type}-${e.detail.namespace}`] || []);
              eventStore.push(e.detail);
            },
          });
        });
      },
      { calNamespace }
    );
  };
};

export const createGetActionFiredDetails = (page: Page) => {
  return async ({ calNamespace, actionType }: { calNamespace: string; actionType: string }) => {
    if (!page.isClosed()) {
      return await page.evaluate(
        ({ actionType, calNamespace }) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-ignore
          return window.eventsFiredStoreForPlaywright[`${actionType}-${calNamespace}`];
        },
        { actionType, calNamespace }
      );
    }
  };
};
