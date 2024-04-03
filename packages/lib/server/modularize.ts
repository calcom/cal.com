import type { NextApiHandler } from "next";

/** Allows to simulate an lazy import with default export**/
export const modularize = (handler: NextApiHandler) =>
  Promise.resolve({
    default: handler,
  });
