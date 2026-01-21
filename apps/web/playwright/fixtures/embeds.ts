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
          //@ts-expect-error
          window.eventsFiredStoreForPlaywright = window.eventsFiredStoreForPlaywright || {};

          // Add a postMessage listener immediately to capture __iframeReady events
          // This avoids the race condition where the event fires before Cal.ns[namespace] is ready
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          //@ts-expect-error
          if (!window.postMessageListenerAdded) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-expect-error
            window.postMessageListenerAdded = true;
            window.addEventListener("message", (event) => {
              // Filter for Cal.com embed messages
              if (
                event.data &&
                typeof event.data === "object" &&
                event.data.originator === "CAL" &&
                event.data.type
              ) {
                const { type, namespace, data } = event.data;
                console.log("PlaywrightTest postMessage:", `Received ${type} for namespace ${namespace}`);

                // Set iframeReady when we receive __iframeReady event for our namespace
                if (type === "__iframeReady" && namespace === calNamespace) {
                  console.log("PlaywrightTest postMessage:", "Setting window.iframeReady = true");
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  //@ts-expect-error
                  window.iframeReady = true;
                }

                // Store the event in our event store
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-expect-error
                const store = window.eventsFiredStoreForPlaywright;
                if (store) {
                  const eventStore = (store[`${type}-${namespace}`] = store[`${type}-${namespace}`] || []);
                  eventStore.push({ type, namespace, fullType: `CAL:${namespace}:${type}`, data });
                }
              }
            });
          }

          document.addEventListener("DOMContentLoaded", function tryAddingListener() {
            if (parent !== window) {
              // Firefox seems to execute this snippet for iframe as well. Avoid that. It must be executed only for parent frame.

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-expect-error
              window.initialBodyVisibility = document.body.style.visibility;

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-expect-error
              window.initialBodyBackground = document.body.style.background;

              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-expect-error
              window.initialValuesSet = true;
              return;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-expect-error
            let api = window.Cal;

            if (!api) {
              console.log("PlaywrightTest:", "window.Cal not available yet, trying again");
              setTimeout(tryAddingListener, 500);
              return;
            }
            if (calNamespace) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-expect-error
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
                console.log("Playwright Embed Fixture: Received event", JSON.stringify(e.detail));
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                window.iframeReady = true; // Technically if there are multiple cal embeds, it can be set due to some other iframe. But it works for now. Improve it when it doesn't work

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
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

      page.on("console", (msg) => {
        console.log(`Browser Console: ${msg.type()}: ${msg.text()}`);
      });

      page.on("framenavigated", async (frame) => {
        console.log(`Navigation occurred in frame: ${frame.url()}`);
      });

      page.on("pageerror", (error) => {
        console.error(`Page error: ${error.message}`);
      });

      page.on("requestfailed", (request) => {
        console.error(`Failed request: ${request.url()}, ${request.failure()?.errorText}`);
      });
    },

    async getActionFiredDetails({ calNamespace, actionType }: { calNamespace: string; actionType: string }) {
      if (!page.isClosed()) {
        return await page.evaluate(
          ({ actionType, calNamespace }) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-expect-error
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
