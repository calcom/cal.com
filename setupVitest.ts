import { JSDOM } from "jsdom";
import { vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

const jsdom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});

global.window = jsdom.window;
global.document = jsdom.window.document;
global.navigator = {
  ...global.navigator,
  userAgent: "node.js",
};
