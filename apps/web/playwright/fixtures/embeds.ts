import type { Page } from "@playwright/test";

export const createEmbedsFixture = (page: Page) => {
  return {
    /**
     * @deprecated
     * Use 'gotoPlayground' instead, to navigate. It calls `addEmbedListeners` automatically.
     */
    async addEmbedListeners(calNamespace: string) {
      await page.addInitScript(
        ({ calNamespace }: { calNamespace: string }) => {
          console.log(
            "PlaywrightTest - InitScript:",
            "Adding listener for __iframeReady on namespace:",
            calNamespace
          );
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
              console.log("PlaywrightTest:", "window.Cal not available yet, trying again");
              setTimeout(tryAddingListener, 500);
              return;
            }
            if (calNamespace) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-ignore
              api = window.Cal.ns[calNamespace];
              console.log("Using api from namespace-", { calNamespace, api });
            }
            if (!api) {
              console.log(`namespace "${calNamespace}" not found yet - Trying again`);
              setTimeout(tryAddingListener, 500);
              return;
            }
            console.log("PlaywrightTest:", `Adding listener for __iframeReady on namespace:${calNamespace}`);
            api("on", {
              action: "*",
              callback: (e) => {
                console.log("Playwright Embed Fixture: Received event", e);
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
    },

    async getActionFiredDetails({ calNamespace, actionType }: { calNamespace: string; actionType: string }) {
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
    },

    async gotoPlayground({ calNamespace, url }: { calNamespace: string; url: string }) {
      await this.addEmbedListeners(calNamespace);
      await page.goto(url);
    },
  };
};
