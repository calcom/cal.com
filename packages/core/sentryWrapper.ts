// import * as Sentry from "@sentry/nextjs";
// // Takes in a callable function and creates a flow to wrap the function with Sentry for tracking the endpoint
// const monitorCallback = async (cb: CallableFunction, ...args: any[]) => {
//   // Start the Sentry performance monitoring transaction
//   const transaction = Sentry.startTransaction({
//     op: cb.name,
//     name: `Sentry performance monitoring for ${cb.name}`,
//   });
//   try {
//     // Await the callback if it's asynchronous
//     const result = await cb(...args);
//     return result;
//   } catch (error) {
//     // Capture exceptions in Sentry
//     Sentry.captureException(error);
//     throw error;
//   } finally {
//     // Ensure the transaction is finished
//     transaction.finish();
//   }
// };
// export default monitorCallback;
import * as Sentry from "@sentry/nextjs";

const monitorCallback = async (cb: CallableFunction, ...args: any[]) => {
  const transaction = Sentry.startTransaction({
    op: cb.name,
    name: `Sentry performance monitoring for ${cb.name}`,
  });

  // Create a main span for the entire callback function
  const mainSpan = transaction.startChild({
    op: "function",
    description: `Executing ${cb.name}`,
  });

  try {
    // Start a child span for the actual operation
    const operationSpan = mainSpan.startChild({
      op: "operation",
      description: "Performing operation",
    });

    const result = await cb(...args);
    operationSpan.finish(); // Finish the operation span
    return result;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  } finally {
    mainSpan.finish(); // Finish the main span
    transaction.finish();
  }
};

export default monitorCallback;
