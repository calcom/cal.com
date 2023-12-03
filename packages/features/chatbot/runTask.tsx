import runConversation from "./runnables/conversationRunnable";
import runRouter from "./runnables/routerRunnable";

const runTask = async (inputValue: string) => {
  // const urlParamsResponse: any = await runRouter(inputValue);

  // const conversationResponse: any = await runConversation(inputValue);

  const [urlParamsResponse, conversationResponse] = await Promise.all([
    // Runnable 1: parse the url params
    runRouter(inputValue),
    // Runnable 2: talk to the user
    runConversation(inputValue),
  ]);

  const outValue = {
    urlParamsResponse: urlParamsResponse,
    conversationResponse: conversationResponse,
  };

  console.log(outValue);

  return outValue;
};

export default runTask;
