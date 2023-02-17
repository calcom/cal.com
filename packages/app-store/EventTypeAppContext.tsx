import React from "react";
import type { z, ZodType } from "zod";

export type GetAppData = (key: string) => unknown;
export type SetAppData = (key: string, value: unknown) => void;
// eslint-disable-next-line @typescript-eslint/no-empty-function
const EventTypeAppContext = React.createContext<[GetAppData, SetAppData]>([() => ({}), () => {}]);

export type SetAppDataGeneric<TAppData extends ZodType> = <
  TKey extends keyof z.infer<TAppData>,
  TValue extends z.infer<TAppData>[TKey]
>(
  key: TKey,
  value: TValue
) => void;

export type GetAppDataGeneric<TAppData extends ZodType> = <TKey extends keyof z.infer<TAppData>>(
  key: TKey
) => z.infer<TAppData>[TKey];

export const useAppContextWithSchema = <TAppData extends ZodType>() => {
  type GetAppData = GetAppDataGeneric<TAppData>;
  type SetAppData = SetAppDataGeneric<TAppData>;
  // TODO: Not able to do it without type assertion here
  const context = React.useContext(EventTypeAppContext) as [GetAppData, SetAppData];
  return context;
};
export default EventTypeAppContext;
