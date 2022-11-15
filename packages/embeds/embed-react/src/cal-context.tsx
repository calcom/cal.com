import { createContext, FunctionComponent, PropsWithChildren, useContext } from "react";

import { GlobalCal } from "@calcom/embed-core";

import { _useLoadCalApi } from "./use-load-cal-api";

export const CalContext = createContext<GlobalCal | null>(null);

export type CalProviderProps = PropsWithChildren<{
  embedJsUrl?: string;
}>;

export const CalProvider: FunctionComponent<CalProviderProps> = (props) => {
  const { children, embedJsUrl, ...restProps } = props;
  const calApi = _useLoadCalApi(embedJsUrl);

  return (
    <CalContext.Provider {...restProps} value={calApi}>
      {children}
    </CalContext.Provider>
  );
};

export const CalConsumer = CalContext.Consumer;

// Strange typing to allow discriminated-union like so :
//   const [calApi, calApiLoaded] = useCalApi()
//   if (calApiLoaded) {
//     /* calApi is not nullable here ! */
//   }
type CalApiHook = [GlobalCal, true] | [null, false];

export const useCalApi: () => CalApiHook = () => {
  const maybeCalApi = useContext(CalContext);

  // See above about strange typing
  return maybeCalApi != null ? [maybeCalApi, true] : [null, false];
};
