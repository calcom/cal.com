import { CalWindow } from "@calcom/embed-core";

import Cal from "./Cal";

export const getCalApi = (ns: string): Promise<CalWindow["Cal"]> =>
  new Promise(function tryReadingFromWindow(resolve) {
    let api = (window as CalWindow).Cal;

    if (!api) {
      setTimeout(() => {
        tryReadingFromWindow(resolve);
      }, 50);
      return;
    }
    if (ns) {
      api = api.ns && api.ns[ns];
      if (!api) {
        throw new Error(`Cal namespace:${ns} not found`);
      }
    }
    resolve(api);
  });

export default Cal;
