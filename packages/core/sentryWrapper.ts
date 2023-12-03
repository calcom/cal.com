import * as Sentry from "@sentry/nextjs";

const monitorCallback = async (cb: CallableFunction, ...args: any[]) => {
  // Attempt to retrieve the current transaction from Sentry's scope
  let transaction = Sentry.getCurrentHub().getScope()?.getTransaction();

  // Check if there's an existing transaction, if not, start a new one
  if (!transaction) {
    transaction = Sentry.startTransaction({
      op: cb.name,
      //   name: `Call to ${cb.name}`,
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
