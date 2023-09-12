import React from "react";
import type { z, ZodType } from "zod";

export type GetAppData = (key: string) => unknown;
export type SetAppData = (key: string, value: unknown) => void;
type LockedIcon = JSX.Element | false | undefined;
type Disabled = boolean | undefined;

type AppContext = {
  getAppData: GetAppData;
  setAppData: SetAppData;
  LockedIcon?: LockedIcon;
  disabled?: Disabled;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const EventTypeAppContext = React.createContext<AppContext>({
  getAppData: () => ({}),
  setAppData: () => ({}),
});

type SetAppDataGeneric<TAppData extends ZodType> = <
  TKey extends keyof z.infer<TAppData>,
  TValue extends z.infer<TAppData>[TKey]
>(
  key: TKey,
  value: TValue
) => void;

type GetAppDataGeneric<TAppData extends ZodType> = <TKey extends keyof z.infer<TAppData>>(
  key: TKey
) => z.infer<TAppData>[TKey];

export const useAppContextWithSchema = <TAppData extends ZodType>() => {
  type GetAppData = GetAppDataGeneric<TAppData>;
  type SetAppData = SetAppDataGeneric<TAppData>;
  // TODO: Not able to do it without type assertion here
  const context = React.useContext(EventTypeAppContext) as {
    getAppData: GetAppData;
    setAppData: SetAppData;
    LockedIcon: LockedIcon;
    disabled: Disabled;
  };
  return context;
};
export default EventTypeAppContext;
