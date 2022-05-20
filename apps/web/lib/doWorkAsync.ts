import noop from "lodash/noop";

const data: Record<string, number> = {};
/**
 * Starts an iteration from `0` to `length - 1` with batch size `batch`
 *
 * `callback` is called per iteration
 *
 * `done` is called when all iterations are done
 *
 * `name` is a unique identifier for the work. It allows the work that is not required to be dropped.
 */
export const doWorkAsync = ({
  length,
  name,
  callback,
  done,
  batch,
  offsetStart,
  batchDone,
  __pending,
}: {
  name: string;
  length: number;
  callback: (i: number, b?: boolean) => void;
  done?: () => void;
  batchDone?: () => void;
  batch: number;
  offsetStart?: number;
  __pending?: boolean;
}) => {
  offsetStart = offsetStart || 0;
  const stepLength = batch;
  const lastIndex = length - 1;
  const offsetEndExclusive = offsetStart + stepLength;

  batchDone = batchDone || noop;
  done = done || noop;

  if (!__pending && data[name]) {
    cancelAnimationFrame(data[name]);
  }

  if (offsetStart >= length) {
    done();
    return;
  }

  for (let i = offsetStart; i < offsetEndExclusive && i < length; i++) {
    callback(i, offsetEndExclusive > lastIndex);
  }

  batchDone();

  data[name] = requestAnimationFrame(() => {
    doWorkAsync({
      length,
      callback,
      batchDone,
      name,
      batch,
      done,
      offsetStart: offsetEndExclusive,
      __pending: true,
    });
  });
};
