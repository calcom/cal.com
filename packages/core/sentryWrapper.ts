import * as Sentry from "@sentry/nextjs";

/*
WHEN TO USE
We ran a script that performs a simple mathematical calculation within a loop of 1000000 iterations. 
Our results were: Plain execution time: 441, Monitored execution time: 8094. 
This suggests that using these wrappers within large loops can incur significant overhead and is thus not recommended.

For smaller loops, the cost incurred may not be very significant on an absolute scale
considering that a million monitored iterations only took roughly 8 seconds when monitored.
*/
const monitorCallback = async (cb: CallableFunction, ...args: any[]) => {
  // Attempt to retrieve the current transaction from Sentry's scope
  let transaction = Sentry.getCurrentHub().getScope()?.getTransaction();

  // Check if there's an existing transaction, if not, start a new one
  if (!transaction) {
    transaction = Sentry.startTransaction({
      op: cb.name,
      name: cb.name,
    });
  }

  // Start a new span in the current transaction
  const span = transaction.startChild({
    op: cb.name,
    description: `Executing ${cb.name}`,
  });

  try {
    const result = await cb(...args);
    return result;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    // Finish the span
    span.finish();

    // If this was a new transaction, finish it
    if (!Sentry.getCurrentHub().getScope()?.getTransaction()) {
      transaction.finish();
    }
  }
};

export default monitorCallback;
