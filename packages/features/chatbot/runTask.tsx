import runConversation from "./runnables/conversationRunnable";
import runRouter from "./runnables/routerRunnable";

const runTask = async (inputValue: string) => {
  // Runnable 1: parse the url params
  const urlParamsResponse: any = await runRouter(inputValue);

  // Runnable 2: talk to the user
  const conversationResponse: any = await runConversation(inputValue);

  const outValue = {
    urlParamsResponse: urlParamsResponse,
    conversationResponse: conversationResponse,
  };

  console.log(outValue);

  return outValue;
};

export default runTask;
