import * as Sentry from "@sentry/nextjs";
import type { Span, Transaction } from "@sentry/types";

/*
WHEN TO USE
We ran a script that performs a simple mathematical calculation within a loop of 1000000 iterations. 
Our results were: Plain execution time: 441, Monitored execution time: 8094. 
This suggests that using these wrappers within large loops can incur significant overhead and is thus not recommended.

For smaller loops, the cost incurred may not be very significant on an absolute scale
considering that a million monitored iterations only took roughly 8 seconds when monitored.
*/

const setUpMonitoring = (name: string) => {
  // Attempt to retrieve the current transaction from Sentry's scope
  let transaction = Sentry.getCurrentHub().getScope()?.getTransaction();

  // Check if there's an existing transaction, if not, start a new one
  if (!transaction) {
    transaction = Sentry.startTransaction({
      op: name,
      name: name,
    });
  }

  // Start a new span in the current transaction
  const span = transaction.startChild({
    op: name,
    description: `Executing ${name}`,
  });
  return [transaction, span];
};

// transaction will always be Transaction, since returned in a list with Span type must be listed as either or here
const finishMonitoring = (transaction: Transaction | Span, span: Span) => {
  // Attempt to retrieve the current transaction from Sentry's scope
  span.finish();

  // If this was a new transaction, finish it
  if (!Sentry.getCurrentHub().getScope()?.getTransaction()) {
    transaction.finish();
  }
};

const monitorCallbackAsync = async <T extends (...args: any[]) => any>(
  cb: T,
  ...args: Parameters<T>
): Promise<ReturnType<T>> => {
  // Check if Sentry set
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return (await cb(...args)) as ReturnType<T>;

  const [transaction, span] = setUpMonitoring(cb.name);

  try {
    const result = await cb(...args);
    return result as ReturnType<T>;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    finishMonitoring(transaction, span);
  }
};

const monitorCallbackSync = <T extends (...args: any[]) => any>(
  cb: T,
  ...args: Parameters<T>
): ReturnType<T> => {
  // Check if Sentry set
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return cb(...args) as ReturnType<T>;

  const [transaction, span] = setUpMonitoring(cb.name);

  try {
    const result = cb(...args);
    return result as ReturnType<T>;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    finishMonitoring(transaction, span);
  }
};

export default monitorCallbackAsync;
export { monitorCallbackSync };
