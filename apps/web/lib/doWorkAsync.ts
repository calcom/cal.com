const data = {};
/**
 * Starts an iteration from `0` to `length - 1` with batch size `batch`
 *
 *  `callback` is called per iteration
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
  __pending,
}: {
  name: string;
  length: number;
  callback: Function;
  done: Function;
  batch: number;
  offsetStart?: number;
  __pending?: boolean;
}) => {
  offsetStart = offsetStart || 0;

  const stepLength = batch;
  const lastIndex = length - 1;
  const offsetEndExclusive = offsetStart + stepLength;
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

  data[name] = requestAnimationFrame(() => {
    doWorkAsync({ length, callback, name, batch, done, offsetStart: offsetEndExclusive, __pending: true });
  });
};
