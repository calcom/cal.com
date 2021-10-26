export type Ensure<T, K extends keyof T> = Omit<T, K> & {
  [EK in K]-?: NonNullable<T[EK]>;
};
