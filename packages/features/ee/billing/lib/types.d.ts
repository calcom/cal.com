import type Stripe from "stripe";

/** Stripe Webhook Handler Mappings */
export type SWHMap = {
  [T in Stripe.DiscriminatedEvent as T["type"]]: {
    [K in keyof T as Exclude<K, "type">]: T[K];
  };
};

export type LazyModule<D> = Promise<{
  default: (data: D) => unknown | Promise<unknown>;
}>;

export type SWHandlers = {
  [K in keyof SWHMap]?: () => LazyModule<SWHMap[K]["data"]>;
};

export type Handlers = Record<`prod_${string}`, () => LazyModule<Data>>;
