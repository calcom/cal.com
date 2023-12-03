// LangChain APIs
import { ChatOpenAI } from "langchain/chat_models/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "langchain/schema";

// Environment variables
import { OPENAI_API_KEY } from "../.env";
// Parameters
import { ROUTER_ENUMS, ROUTER_MSGS } from "../params/enums";
import { GPT_MODEL } from "../params/models";
// Types
import type { RouterResponseType } from "../types/responseTypes";

// Instantiate the parser
const parser = new JsonOutputFunctionsParser();

// Define the function schema
const extractionFunctionSchema = {
  name: "extractor",
  description: "Extracts fields from the input.",
  parameters: {
    type: "object",
    properties: {
      url_param: {
        type: "string",
        enum: ROUTER_ENUMS,
        description: "The URL parameter to extract.",
      },
      message: {
        type: "string",
        enum: ROUTER_MSGS,
        description: "The message to send to the user.",
      },
    },
    required: ["url_param", "message"],
  },
};

// Instantiate the ChatOpenAI class
const model = new ChatOpenAI({
  modelName: GPT_MODEL,
  openAIApiKey: OPENAI_API_KEY,
});

// Create a new runnable, bind the function to the model, and pipe the output through the parser
const runnable = model
  .bind({
    functions: [extractionFunctionSchema],
    function_call: { name: "extractor" },
  })
  .pipe(parser);

const run = async (inputValue: string): Promise<RouterResponseType> => {
  // Run the runnable
  const result = await runnable.invoke([new HumanMessage(inputValue)]);
  return result;

  /**
  {
    result: {
      url_param: "/apps",
      message: "Going to /apps"
    }
  }
  */
};

export default run;
