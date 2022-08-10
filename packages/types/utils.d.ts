/** Makes selected props from a record non optional  */
export type Ensure<T, K extends keyof T> = Omit<T, K> & {
  [EK in K]-?: NonNullable<T[EK]>;
};

/** Makes selected props from a record optional  */
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/** Get the union type of all the values in an object, array or array-like type `T` */
export type ValuesType<T extends ReadonlyArray<unknown> | ArrayLike<unknown> | Record<unknown, unknown>> =
  T extends ReadonlyArray<unknown>
    ? T[number]
    : T extends ArrayLike<unknown>
    ? T[number]
    : T extends object
    ? T[keyof T]
    : never;
