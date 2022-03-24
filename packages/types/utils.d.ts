/** Makes selected props from a record non optional  */
export type Ensure<T, K extends keyof T> = Omit<T, K> & {
  [EK in K]-?: NonNullable<T[EK]>;
};

/** Makes selected props from a record optional  */
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
