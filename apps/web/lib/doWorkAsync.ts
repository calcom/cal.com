export const doWorkAsync = ({
  length,
  callback,
  done,
  batch,
  offsetStart,
}: {
  length: number;
  callback: Function;
  done: Function;
  batch: number;
  offsetStart?: number;
}) => {
  offsetStart = offsetStart || 0;

  const stepLength = batch;
  const lastIndex = length - 1;
  const offsetEndExclusive = offsetStart + stepLength;
  if (offsetStart >= length) {
    done();
    return;
  }

  for (let i = offsetStart; i < offsetEndExclusive && i < length; i++) {
    callback(i, offsetEndExclusive > lastIndex);
  }

  requestAnimationFrame(() => {
    doWorkAsync({ length, callback, batch, done, offsetStart: offsetEndExclusive });
  });
};
