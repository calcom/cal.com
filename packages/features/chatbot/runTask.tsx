import runConversation from "./runnables/conversationRunnable";
import runRouter from "./runnables/routerRunnable";

const runTask = async (inputValue: string) => {
  const [urlParamsResponse, conversationResponse] = await Promise.all([
    // Runnable 1: parse the url params
    runRouter(inputValue),
    // Runnable 2: talk to the user
    runConversation(inputValue),
  ]);

  const outValue = {
    // Response 1: url params
    urlParamsResponse: urlParamsResponse,
    // Response 2: conversation response
    conversationResponse: conversationResponse,
  };

  console.log(outValue);
  return outValue;
};

export default runTask;
