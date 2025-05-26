import "../test/__mocks__/windowMatchMedia";

import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";

import { submitResponseAndGetRoutingResult } from "./utils";

vi.mock("./tailwindCss", () => ({
  default: "mockedTailwindCss",
}));

vi.mock("./utils", async () => {
  const actual = (await vi.importActual("./utils")) as any;

  return {
    ...actual,
    submitResponseAndGetRoutingResult: vi.fn(),
  };
});

type ExpectedModalBoxAttrs = {
  theme: string;
  layout: string;
  pageType: string | null;
  state: "loading" | "loaded" | "failed" | "reopened" | "closed" | "prerendering" | "has-message" | null;
  uid?: string | null;
};

type ExpectedIframeUrlObject = {
  pathname: string;
  searchParams: URLSearchParams;
  origin: string | null;
};

function log(...args: any[]) {
  console.log("Test:", ...args);
}

function buildModalArg(arg: { calLink: string; config: Record<string, string> }) {
  return {
    ...arg,
    // Copies the config object so that we don't mutate the original one
    config: {
      ...arg.config,
    },
  };
}

function expectCalModalBoxToBeInDocument(expectedAttrs: ExpectedModalBoxAttrs) {
  const calModalBox = document.querySelector("cal-modal-box") as HTMLElement;
  expect(calModalBox).toBeTruthy();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const modalBox = calModalBox!;

  // Verify required attributes are present
  expect(modalBox.hasAttribute("uid")).toBe(true);

  // Verify data attributes exist (even if empty)
  expect(modalBox.getAttribute("data-theme")).toBe(expectedAttrs.theme);
  expect(modalBox.getAttribute("data-layout")).toBe(expectedAttrs.layout);
  // Verify expected attributes if provided
  expect(modalBox.getAttribute("state")).toBe(expectedAttrs.state);

  expect(modalBox.getAttribute("data-page-type")).toBe(expectedAttrs.pageType);
  if (expectedAttrs.uid) {
    expect(modalBox.getAttribute("uid")).toBe(expectedAttrs.uid);
  }

  return modalBox;
}

function compareUrlSearchParams(actual: URLSearchParams, expected: URLSearchParams) {
  // Create new URLSearchParams to avoid modifying the original
  const actualParams = new URLSearchParams(actual);
  actualParams.delete("embed");

  // Convert both to plain objects for comparison
  const actualObj = Object.fromEntries(actualParams.entries());
  const expectedObj = Object.fromEntries(expected.entries());

  if (JSON.stringify(actualObj) !== JSON.stringify(expectedObj)) {
    console.log({
      actual: actualObj,
      expected: expectedObj,
    });
  }
  expect(actualObj).toEqual(expectedObj);
}

function expectIframeToHaveMatchingUrl({
  element,
  expectedIframeUrlObject,
}: {
  element: HTMLElement;
  expectedIframeUrlObject: ExpectedIframeUrlObject;
}) {
  const iframe = element.querySelector("iframe") as HTMLIFrameElement;
  const actualUrl = new URL(iframe.src);
  const pathForEmbed = `${expectedIframeUrlObject.pathname}/embed`;
  expect(actualUrl.origin).toBe(expectedIframeUrlObject.origin || process.env.EMBED_PUBLIC_WEBAPP_URL || "");
  expect(actualUrl.pathname).toBe(pathForEmbed);
  compareUrlSearchParams(new URLSearchParams(actualUrl.search), expectedIframeUrlObject.searchParams);

  return iframe;
}

function expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
  expectedModalBoxAttrs,
  expectedIframeUrlObject,
}: {
  expectedModalBoxAttrs: ExpectedModalBoxAttrs;
  expectedIframeUrlObject: ExpectedIframeUrlObject;
}) {
  const modalBox = expectCalModalBoxToBeInDocument({
    state: expectedModalBoxAttrs.state,
    theme: expectedModalBoxAttrs.theme,
    layout: expectedModalBoxAttrs.layout,
    pageType: expectedModalBoxAttrs.pageType,
  });

  const iframe = expectIframeToHaveMatchingUrl({
    element: modalBox,
    expectedIframeUrlObject: {
      ...expectedIframeUrlObject,
      origin: expectedIframeUrlObject.origin || process.env.EMBED_PUBLIC_WEBAPP_URL || "",
    },
  });

  return { modalBox, iframe };
}

describe("Cal", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CalClass: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let calInstance: any;

  function mockSearchParams(search: string) {
    Object.defineProperty(window, "location", {
      value: { search },
      writable: true,
    });
  }

  beforeAll(async () => {
    vi.stubEnv("EMBED_PUBLIC_WEBAPP_URL", "https://app.cal.com");
    // Mock window.Cal
    const mockWindowCal = {
      q: [],
      ns: {},
    };
    Object.defineProperty(window, "Cal", {
      value: mockWindowCal,
      writable: true,
    });

    // Import dynamicall so that we could mock/override certain things before loading the embed.ts as it has side effects
    CalClass = (await import("./embed")).Cal;
  });

  beforeEach(() => {
    vi.stubEnv("WEBAPP_URL", "https://app.cal.com");

    calInstance = new CalClass("test-namespace", []);
    // Reset the document body before each test
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("calInstance.createIframe", () => {
    describe("params handling with forwardQueryParams feature enabled", () => {
      beforeEach(() => {
        calInstance = new CalClass("test-namespace", []);
        window.Cal.config = { forwardQueryParams: true };
        // Mock the getConfig method
        calInstance.getConfig = vi.fn().mockReturnValue({ calOrigin: "https://app.cal.com" });
      });

      it("should merge query parameters from URL and explicit params", () => {
        mockSearchParams("?existingParam=value");

        const iframe = calInstance.createIframe({
          calLink: "john-doe/meeting",
          config: { newParam: "newValue" },
          calOrigin: null,
        });

        expect(iframe.src).toContain("existingParam=value");
        expect(iframe.src).toContain("newParam=newValue");
      });

      it("should not lose duplicate params in page query", () => {
        mockSearchParams("?param1=value1&param1=value2");

        const iframe = calInstance.createIframe({
          calLink: "john-doe/meeting",
          config: { param2: "value3" },
          calOrigin: null,
        });

        const urlParams = new URLSearchParams(new URL(iframe.src).search);
        const paramValues = urlParams.getAll("param1");
        expect(paramValues).toEqual(["value1", "value2"]);
      });

      it("should override the duplicate params in page if the same param exists in explicit config", () => {
        mockSearchParams("?param=value1&param=value2");

        const iframe = calInstance.createIframe({
          calLink: "john-doe/meeting",
          config: { param: "value3" },
          calOrigin: null,
        });

        const urlParams = new URLSearchParams(new URL(iframe.src).search);
        const paramValues = urlParams.getAll("param");
        expect(paramValues).toEqual(["value3"]);
      });

      it("should exclude reserved params from the page URL(as these could be unintentional to pass these query params to embed, so better to exclude them and avoid crashing the booking page)", () => {
        mockSearchParams("?date=2023-05-01&duration=30&hello=world");

        const iframe = calInstance.createIframe({
          calLink: "john-doe/meeting",
          config: {
            email: "test@example.com",
          },
          calOrigin: null,
        });

        expect(iframe.src).not.toContain("date=");
        expect(iframe.src).not.toContain("duration=");
        expect(iframe.src).toContain("hello=");
        expect(iframe.src).toContain("email=test%40example.com");
      });

      it("should allow configuring reserved params through config(as it is explicitly passed by user)", () => {
        const iframe = calInstance.createIframe({
          calLink: "john-doe/meeting",
          config: {
            date: "2023-05-01",
            duration: "30",
            email: "test@example.com",
          },
          calOrigin: null,
        });

        expect(iframe.src).toContain("date=2023-05-01");
        expect(iframe.src).toContain("duration=30");
        expect(iframe.src).toContain("email=test%40example.com");
      });

      it("should allow configuring reserved params through direct URL params to embed calLink(as it is explicitly passed by user)", () => {
        const iframe = calInstance.createIframe({
          calLink: "john-doe/meeting?date=2023-05-01&duration=30&email=test@example.com",
          calOrigin: null,
        });

        expect(iframe.src).toContain("date=2023-05-01");
        expect(iframe.src).toContain("duration=30");
        expect(iframe.src).toContain("email=test%40example.com");
      });

      it("should respect forwardQueryParams setting to disable sending page query params but still send the ones in the config", () => {
        mockSearchParams("?param1=value");

        window.Cal.config = { forwardQueryParams: false };

        const iframe = calInstance.createIframe({
          calLink: "john-doe/meeting",
          config: { param2: "value" },
          calOrigin: null,
        });

        expect(iframe.src).not.toContain("param1=value");
        expect(iframe.src).toContain("param2=value");
      });
    });
  });

  /**
   * We don't mock the createIframe method as it could update the 'this' objects which could affect the test, so we avoid mocking it
   */
  describe("calInstance.api.modal", () => {
    const initialStateOfModal = "loading";
    const baseModalArgs = {
      calLink: "john-doe/meeting",
      config: {
        theme: "light",
        layout: "modern",
      },
    };
    beforeEach(() => {
      vi.spyOn(calInstance, "doInIframe");
    });

    it("should create a new modal when none exists", () => {
      calInstance.api.modal(baseModalArgs);

      const modalBox = expectCalModalBoxToBeInDocument({
        theme: "light",
        layout: "modern",
        pageType: null,
        state: initialStateOfModal,
      });

      expectIframeToHaveMatchingUrl({
        element: modalBox,
        expectedIframeUrlObject: {
          pathname: `/${baseModalArgs.calLink}`,
          searchParams: new URLSearchParams({
            ...baseModalArgs.config,
            embedType: "modal",
          }),
          origin: process.env.EMBED_PUBLIC_WEBAPP_URL || "",
        },
      });
    });

    describe("Prerendering", () => {
      it("should create modal having iframe with correct attributes when in prerendering mode", () => {
        const modalArg = {
          ...baseModalArgs,
          config: {
            ...baseModalArgs.config,
            "cal.embed.pageType": "doesntmatter",
          },
          calOrigin: null,
          __prerender: true,
        };
        calInstance.api.modal(modalArg);

        const modalBox = expectCalModalBoxToBeInDocument({
          state: "prerendering",
          pageType: modalArg.config["cal.embed.pageType"],
          theme: modalArg.config.theme,
          layout: modalArg.config.layout,
        });

        expectIframeToHaveMatchingUrl({
          element: modalBox,
          expectedIframeUrlObject: {
            pathname: `/${modalArg.calLink}`,
            searchParams: new URLSearchParams({
              ...modalArg.config,
              prerender: "true",
              embedType: "modal",
            }),
            origin: null,
          },
        });
      });

      describe("Modal State Transitions", () => {
        it(`should handle prerender -> open(with prefill) -> reopen scenario`, () => {
          // Prerender the modal
          const modalArg = {
            ...baseModalArgs,
          };

          const { modalBoxUid, expectedConfig } = (function prerender(): {
            modalBoxUid: string | null;
            expectedConfig: Record<string, string>;
          } {
            log("Prerendering the modal");
            calInstance.api.modal({ ...buildModalArg(modalArg), __prerender: true });
            const expectedConfig = {
              ...modalArg.config,
              embedType: "modal",
            };

            const { modalBox } = expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "prerendering",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            const modalBoxUid = modalBox.getAttribute("uid");
            return { modalBoxUid, expectedConfig };
          })();

          const { modalArgWithPrefilledConfig } = (function prefill() {
            log("Opening the modal with prefill config");
            const modalArgWithPrefilledConfig = {
              ...modalArg,
              config: { ...modalArg.config, name: "John Doe", email: "john@example.com" },
            };
            // Second modal call with additional config value for prefilling
            calInstance.api.modal(modalArgWithPrefilledConfig);

            const expectedConfigAfterPrefilling = {
              ...expectedConfig,
              name: modalArgWithPrefilledConfig.config.name,
              email: modalArgWithPrefilledConfig.config.email,
            };

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                // Expect the modal to go to loading state - which starts the loader animation
                state: "loading",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
                uid: modalBoxUid,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  // It remains because internally we remove prerender=true in iframe, as it is connect mode
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            // This would update the iframe document URL through embed-iframe.
            expect(calInstance.doInIframe).toHaveBeenCalledWith({
              method: "connect",
              arg: {
                config: expectedConfigAfterPrefilling,
                params: {},
              },
            });

            vi.mocked(calInstance.doInIframe).mockClear();
            return { modalArgWithPrefilledConfig };
          })();

          (function reopen() {
            log("Reopening the same modal without any changes");
            calInstance.api.modal(modalArgWithPrefilledConfig);

            // Connect won't happen again
            expect(calInstance.doInIframe).not.toHaveBeenCalledWith(
              expect.objectContaining({
                method: "connect",
              })
            );

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                // Expect the modal to just go to "reopened" state
                state: "reopened",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
                uid: modalBoxUid,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  // It remains because we are just reopening the same modal
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            expect(document.querySelectorAll("cal-modal-box").length).toBe(1);
          })();
        });

        it(`should handle prerender -> open(with prefill) -> error -> loading scenario`, () => {
          // Prerender the modal
          const modalArg = {
            ...baseModalArgs,
          };

          const { modalBoxUid, modalBox, expectedConfig } = (function prerender() {
            calInstance.api.modal({ ...buildModalArg(modalArg), __prerender: true });

            const expectedConfig = {
              ...modalArg.config,
              embedType: "modal",
            };

            const { modalBox } = expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "prerendering",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            const modalBoxUid = modalBox.getAttribute("uid");
            return { modalBoxUid, modalBox, expectedConfig };
          })();

          const { modalArgWithPrefilledConfig, expectedConfigAfterPrefilling } = (function prefill() {
            log("Opening the modal with prefill config");
            const modalArgWithPrefilledConfig = {
              ...modalArg,
              config: { ...modalArg.config, name: "John Doe", email: "john@example.com" },
            };

            // Second modal call with additional config value for prefilling
            calInstance.api.modal({ ...buildModalArg(modalArgWithPrefilledConfig) });

            const expectedConfigAfterPrefilling = {
              ...expectedConfig,
              name: modalArgWithPrefilledConfig.config.name,
              email: modalArgWithPrefilledConfig.config.email,
            };

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                // Expect the modal to go to loading state - which starts the loader animation
                state: "loading",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
                uid: modalBoxUid,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  // It remains because internally we remove prerender=true in iframe
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            expect(calInstance.doInIframe).toHaveBeenCalledWith({
              method: "connect",
              arg: {
                config: expectedConfigAfterPrefilling,
                params: {},
              },
            });

            vi.mocked(calInstance.doInIframe).mockClear();
            return { modalArgWithPrefilledConfig, expectedConfigAfterPrefilling };
          })();

          log("Simulating an error state");
          modalBox.setAttribute("state", "failed");

          (function reopen() {
            log("Reopening the same modal but it is in error state, so full page load would be initiated");
            calInstance.api.modal(modalArgWithPrefilledConfig);

            expect(calInstance.doInIframe).not.toHaveBeenCalledWith(
              expect.objectContaining({
                method: "connect",
              })
            );

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                // Expect the modal to just go to "reopened" state
                state: "loading",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
                uid: modalBoxUid,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams(expectedConfigAfterPrefilling),
                origin: null,
              },
            });

            expect(document.querySelectorAll("cal-modal-box").length).toBe(1);
          })();
        });

        it("should handle prerender(booking link) -> headless router submission -> reuse booking link ", async () => {
          // Prerender the modal
          const modalArg = {
            ...baseModalArgs,
            calLink: "sales/demo",
          };

          const { expectedConfig } = (function prerender(): { expectedConfig: Record<string, string> } {
            log("Prerendering the modal");
            calInstance.api.modal({ ...buildModalArg(modalArg), __prerender: true });

            const expectedConfig = {
              ...modalArg.config,
              embedType: "modal",
            };

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "prerendering",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            return { expectedConfig };
          })();

          vi.mocked(submitResponseAndGetRoutingResult).mockImplementation(() => {
            return Promise.resolve({
              // Redirecting to the booking link that is already prerendered
              redirect: `${process.env.EMBED_PUBLIC_WEBAPP_URL}/${modalArg.calLink}`,
            });
          });

          await (async function headlessRouterSubmission() {
            log("Submitting the routing form headless");
            const config = expectedConfig;
            const configWithPrefilledValues = {
              ...config,
              name: "John Doe",
              email: "john@example.com",
            };

            const modalOpenPromise = calInstance.api.modal({
              ...modalArg,
              calLink: "router?form=FORM_ID",
              config: configWithPrefilledValues,
            });

            // State must immediately change to loading, so that loader is shown
            const calModalBox = document.querySelector("cal-modal-box") as HTMLElement;
            expect(calModalBox.getAttribute("state")).toBe("loading");
            await modalOpenPromise;
            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "loading",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...config,
                  // It remains because internally we remove prerender=true in iframe as it is connect mode
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            // Now check that we connected with the right config
            expect(calInstance.doInIframe).toHaveBeenCalledWith(
              expect.objectContaining({
                method: "connect",
                arg: {
                  config: configWithPrefilledValues,
                  params: {},
                },
              })
            );
          })();
        });

        it("should handle prerender(booking link) -> headless router submission -> different booking link redirect -> fresh page load", async () => {
          // Prerender the modal
          const modalArg = {
            ...baseModalArgs,
            calLink: "sales/demo",
          };

          const { expectedConfig } = (function prerender(): { expectedConfig: Record<string, string> } {
            log("Prerendering the modal");
            calInstance.api.modal({ ...buildModalArg(modalArg), __prerender: true });

            const expectedConfig = {
              ...modalArg.config,
              embedType: "modal",
            };

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "prerendering",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            return { expectedConfig };
          })();

          const headlessRouterRedirectUrlWithPathOnly = `/something_else_than_prerendered_link`;
          vi.mocked(submitResponseAndGetRoutingResult).mockImplementation(() => {
            return Promise.resolve({
              // Redirecting to the booking link that is already prerendered
              redirect: `${process.env.EMBED_PUBLIC_WEBAPP_URL}${headlessRouterRedirectUrlWithPathOnly}?routingFormResponseId=xyz`,
            });
          });

          await (async function headlessRouterSubmission() {
            log("Submitting the modal");
            const config = expectedConfig;
            const configWithPrefilledValues = {
              ...config,
              name: "John Doe",
              email: "john@example.com",
            };
            const configWithPrefilledValuesAndHeadlessRouterRedirectParams = {
              ...configWithPrefilledValues,
              routingFormResponseId: "xyz",
            };

            const modalOpenPromise = calInstance.api.modal({
              ...modalArg,
              calLink: "router?form=FORM_ID",
              config: configWithPrefilledValues,
            });

            const calModalBox = document.querySelector("cal-modal-box") as HTMLElement;
            expect(calModalBox.getAttribute("state")).toBe("loading");
            await modalOpenPromise;

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "loading",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: headlessRouterRedirectUrlWithPathOnly,
                searchParams: new URLSearchParams(configWithPrefilledValuesAndHeadlessRouterRedirectParams),
                origin: null,
              },
            });

            // Now check that we connected with the right config
            expect(calInstance.doInIframe).not.toHaveBeenCalledWith(
              expect.objectContaining({
                method: "connect",
              })
            );
          })();
        });

        it("should handle prerender(booking link) -> headless router submission -> Message ", async () => {
          // Prerender the modal
          const modalArg = {
            ...baseModalArgs,
            calLink: "sales/demo",
          };

          const { expectedConfig } = (function prerender(): { expectedConfig: Record<string, string> } {
            log("Prerendering the modal");
            calInstance.api.modal({ ...buildModalArg(modalArg), __prerender: true });

            const expectedConfig = {
              ...modalArg.config,
              embedType: "modal",
            };

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "prerendering",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            return { expectedConfig };
          })();

          vi.mocked(submitResponseAndGetRoutingResult).mockImplementation(() => {
            return Promise.resolve({
              status: "success",
              // Redirecting to the booking link that is already prerendered
              message: "Fallback Route Message",
            });
          });

          await (async function headlessRouterSubmission() {
            log("Submitting the modal");
            const config = expectedConfig;
            const configWithPrefilledValues = {
              ...config,
              name: "John Doe",
              email: "john@example.com",
            };

            const modalOpenPromise = calInstance.api.modal({
              ...modalArg,
              calLink: "router?form=FORM_ID",
              config: configWithPrefilledValues,
            });

            const calModalBox = document.querySelector("cal-modal-box") as HTMLElement;
            expect(calModalBox.getAttribute("state")).toBe("loading");
            await modalOpenPromise;

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "has-message",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            // Now check that we connected with the right config
            expect(calInstance.doInIframe).not.toHaveBeenCalledWith(
              expect.objectContaining({
                method: "connect",
              })
            );

            expect(calModalBox.getAttribute("data-message")).toBe("Fallback Route Message");
          })();
        });

        it("should handle prerender(booking link) -> headless router submission -> Error Message", async () => {
          // Prerender the modal
          const modalArg = {
            ...baseModalArgs,
            calLink: "sales/demo",
          };

          const { expectedConfig } = (function prerender(): { expectedConfig: Record<string, string> } {
            log("Prerendering the modal");
            calInstance.api.modal({ ...buildModalArg(modalArg), __prerender: true });

            const expectedConfig = {
              ...modalArg.config,
              embedType: "modal",
            };

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "prerendering",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            return { expectedConfig };
          })();

          vi.mocked(submitResponseAndGetRoutingResult).mockImplementation(() => {
            return Promise.resolve({
              error: "Fallback Route Error",
            });
          });

          await (async function headlessRouterSubmission() {
            log("Submitting the modal");
            const config = expectedConfig;
            const configWithPrefilledValues = {
              ...config,
              name: "John Doe",
              email: "john@example.com",
            };

            const modalOpenPromise = calInstance.api.modal({
              ...modalArg,
              calLink: "router?form=FORM_ID",
              config: configWithPrefilledValues,
            });

            const calModalBox = document.querySelector("cal-modal-box") as HTMLElement;
            expect(calModalBox.getAttribute("state")).toBe("loading");
            await modalOpenPromise;

            expectCalModalBoxToBeInDocumentWithIframeHavingUrl({
              expectedModalBoxAttrs: {
                state: "failed",
                theme: modalArg.config.theme,
                layout: modalArg.config.layout,
                pageType: null,
              },
              expectedIframeUrlObject: {
                pathname: `/${modalArg.calLink}`,
                searchParams: new URLSearchParams({
                  ...expectedConfig,
                  prerender: "true",
                  "cal.skipSlotsFetch": "true",
                }),
                origin: null,
              },
            });

            // Now check that we connected with the right config
            expect(calInstance.doInIframe).not.toHaveBeenCalledWith(
              expect.objectContaining({
                method: "connect",
              })
            );
            expect(calModalBox.getAttribute("data-error-code")).toBe("routerError");
            expect(calModalBox.getAttribute("data-message")).toBe("Fallback Route Error");
          })();
        });
      });
    });

    describe("Reopening a non-prerendered modal", () => {
      // Reopening a non-prerendered modal is disabled at the moment and instead it creates a new modal
      it.skip("should reuse the same modal", () => {
        // Preloaded modal
        const modalArg = {
          calLink: "john-doe/meeting",
          config: {
            theme: "light",
            layout: "modern",
          },
        };

        calInstance.api.modal(modalArg);

        const prerenderedModalBox = expectCalModalBoxToBeInDocument({
          state: null,
          theme: modalArg.config.theme,
          layout: modalArg.config.layout,
          pageType: null,
        });

        const prerenderedModalBoxUid = prerenderedModalBox.getAttribute("uid");

        // Second modal creation with same conditions
        calInstance.api.modal(modalArg);

        expectCalModalBoxToBeInDocument({
          state: null,
          theme: modalArg.config.theme,
          layout: modalArg.config.layout,
          pageType: null,
          uid: prerenderedModalBoxUid,
        });
        expect(document.querySelectorAll("cal-modal-box").length).toBe(1);
      });
    });
  });

  describe("getNextActionForModal", () => {
    const baseArgs = {
      pathWithQueryToLoad: "john-doe/meeting",
      modal: {
        uid: "test-uid",
        element: document.querySelector("cal-modal-box") as HTMLElement,
        calOrigin: "https://app.cal.com",
      },
      stateData: {
        embedConfig: { theme: "light" },
        previousEmbedConfig: { theme: "light" },
        isConnectionInitiated: true,
        previousEmbedRenderStartTime: Date.now() - 1000, // 1 second ago
        embedRenderStartTime: Date.now(),
      },
    };

    beforeEach(() => {
      calInstance = new CalClass("test-namespace", []);
      calInstance.iframe = {
        src: "https://app.cal.com/john-doe/meeting",
        dataset: {
          calLink: "john-doe/meeting",
        },
      };
      // Initialize config
      calInstance.__config = {
        calOrigin: "https://app.cal.com",
      };
      // Reset document.querySelector mock before each test
      vi.restoreAllMocks();
    });

    it("should return fullReload when cal link is different", () => {
      calInstance.iframe.dataset.calLink = "jane-doe/meeting";
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
      });
      expect(result).toBe("fullReload");
    });

    it("should return fullReload when in failed state", () => {
      // Mock document.querySelector to simulate a failed modal
      document.querySelector = vi.fn().mockReturnValue({
        getAttribute: () => "failed",
      });

      const result = calInstance.getNextActionForModal(baseArgs);
      expect(result).toBe("fullReload");
    });

    it("should return fullReload when threshold time has passed", () => {
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
        stateData: {
          ...baseArgs.stateData,
          previousEmbedRenderStartTime: Date.now() - 1000000, // Much older timestamp
          embedRenderStartTime: Date.now(),
        },
      });
      expect(result).toBe("fullReload");
    });

    it("should return connect when config is different", () => {
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
        stateData: {
          ...baseArgs.stateData,
          embedConfig: { theme: "dark" },
          previousEmbedConfig: { theme: "light" },
        },
      });
      expect(result).toBe("connect");
    });

    it("should return connect when config prop type is different", () => {
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
        stateData: {
          ...baseArgs.stateData,
          embedConfig: { param: 1 },
          previousEmbedConfig: { param: { a: 1 } },
        },
      });
      expect(result).toBe("connect");
    });

    test("for same config, if number of props are different, it should return connect", () => {
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
        stateData: {
          ...baseArgs.stateData,
          embedConfig: { param1: "value1", param2: "value2" },
          previousEmbedConfig: { param1: "value1" },
        },
      });
      expect(result).toBe("connect");
    });

    it("should return connect when config.guests change", () => {
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
        stateData: {
          ...baseArgs.stateData,
          embedConfig: { guests: ["john@example.com", "jane@example.com"] },
          previousEmbedConfig: { guests: ["john@example.com"] },
        },
      });
      expect(result).toBe("connect");
    });

    it("should return noAction when config.guests are same", () => {
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
        stateData: {
          ...baseArgs.stateData,
          embedConfig: { guests: ["john@example.com", "jane@example.com"] },
          previousEmbedConfig: { guests: ["jane@example.com", "john@example.com"] },
        },
      });
      expect(result).toBe("noAction");
    });

    it("should return connect when query params are different", () => {
      calInstance.iframe.src = "https://app.cal.com/john-doe/meeting?param2=value2";
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
        pathWithQueryToLoad: "john-doe/meeting?param1=value1",
      });
      expect(result).toBe("connect");
    });

    it("should return connect when connection is not initiated", () => {
      const result = calInstance.getNextActionForModal({
        ...baseArgs,
        stateData: {
          ...baseArgs.stateData,
          isConnectionInitiated: false,
        },
      });
      expect(result).toBe("connect");
    });

    it("should return noAction when everything is the same", () => {
      // Mock document.querySelector to simulate a non-failed modal
      document.querySelector = vi.fn().mockReturnValue({
        getAttribute: () => "loaded",
      });

      const result = calInstance.getNextActionForModal(baseArgs);
      expect(result).toBe("noAction");
    });
  });
});
