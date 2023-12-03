// Runnables
import runConversation from "./runnables/conversationRunnable";
import runRouter from "./runnables/routerRunnable";
// Types
import type { TaskResponseType } from "./types/responseTypes";

const runTask = async (inputValue: string): Promise<TaskResponseType> => {
  // Step 1: run all chatbots
  const [routerResponse, conversationResponse] = await Promise.all([
    // Runnable 1: parse the url params
    runRouter(inputValue),
    // Runnable 2: talk to the user
    runConversation(inputValue),
  ]);

  // Step 2: parse the response and route results accordingly
  const url_params = routerResponse.url_param;

  // Step 3: encapsulate the response
  // Case 1: url parser succeeded, disable conversation bot
  if (url_params !== "None") {
    console.log(routerResponse);
    return routerResponse;
  }
  // Case 2: url parser failed, return conversation bot's response
  else {
    const outValue = {
      url_param: routerResponse.url_param,
      message: conversationResponse.text,
    };
    console.log(outValue);
    return outValue;
  }
};

export default runTask;
