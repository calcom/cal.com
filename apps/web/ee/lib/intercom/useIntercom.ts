import { useIntercom as _useIntercom } from "react-use-intercom";

export const useIntercom =
  typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_INTERCOM_APP_ID
    ? _useIntercom
    : () => ({
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        boot: () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        show: () => {},
      });

export default useIntercom;
