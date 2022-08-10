import noop from "lodash/noop";
import { useIntercom as _useIntercom } from "react-use-intercom";

export const useIntercom =
  typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_INTERCOM_APP_ID
    ? _useIntercom
    : () => ({
        boot: noop,
        show: noop,
      });

export default useIntercom;
