export type WithLocaleProps<T extends Record<string, unknown>> = T & {
  newLocale: string;
};
