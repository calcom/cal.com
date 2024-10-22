import { startSpan, captureException } from "@sentry/nextjs";

/*
WHEN TO USE
We ran a script that performs a simple mathematical calculation within a loop of 1000000 iterations. 
Our results were: Plain execution time: 441, Monitored execution time: 8094. 
This suggests that using these wrappers within large loops can incur significant overhead and is thus not recommended.

For smaller loops, the cost incurred may not be very significant on an absolute scale
considering that a million monitored iterations only took roughly 8 seconds when monitored.
*/

const monitorCallbackAsync = async <T extends (...args: any[]) => any>(
  cb: T,
  ...args: Parameters<T>
): Promise<ReturnType<T>> => {
  // Check if Sentry set
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return (await cb(...args)) as ReturnType<T>;

  return await startSpan({ name: cb.name }, async () => {
    try {
      const result = await cb(...args);
      return result as ReturnType<T>;
    } catch (error) {
      captureException(error);
      throw error;
    }
  });
};

const monitorCallbackSync = <T extends (...args: any[]) => any>(
  cb: T,
  ...args: Parameters<T>
): ReturnType<T> => {
  // Check if Sentry set
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return cb(...args) as ReturnType<T>;

  return startSpan({ name: cb.name }, () => {
    try {
      const result = cb(...args);
      return result as ReturnType<T>;
    } catch (error) {
      captureException(error);
      throw error;
    }
  });
};

export default monitorCallbackAsync;
export { monitorCallbackSync };
