import { expect } from "vitest";

// eslint-disable-next-line
export const expectFunctionToBeCalledNthTimesWithArgs = (fn: Function, n: number, args: any) => {
  expect(fn).toHaveBeenCalledTimes(n);
  expect(fn).toHaveBeenCalledWith(args);
};
