import type { Handler } from "./compose";
import { defaultHandler } from "./defaultHandler";
import { modularize } from "./modularize";

/** Shorthand for POST API handlers **/
export const postHandler = (handler: Handler) =>
  defaultHandler({
    POST: modularize(handler),
  });
