import { startSpan } from "@sentry/nextjs";
import { Container } from "inversify";

import { FeaturesModule } from "@calcom/features/flags/features.module";

import type { DI_RETURN_TYPES } from "./types";
import { DI_SYMBOLS } from "./types";

const ApplicationContainer = new Container({
  defaultScope: "Singleton",
});

export const initializeContainer = () => {
  ApplicationContainer.load(FeaturesModule);
};

export const destroyContainer = () => {
  ApplicationContainer.unload(FeaturesModule);
};

if (process.env.NODE_ENV !== "test") {
  initializeContainer();
}

export function getInjection<K extends keyof typeof DI_SYMBOLS>(symbol: K): DI_RETURN_TYPES[K] {
  return startSpan(
    {
      name: "(di) getInjection",
      op: "function",
      attributes: { symbol: symbol.toString() },
    },
    () => ApplicationContainer.get(DI_SYMBOLS[symbol])
  );
}

export { ApplicationContainer };
