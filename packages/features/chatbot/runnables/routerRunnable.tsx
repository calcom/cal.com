// LangChain APIs
import { ChatOpenAI } from "langchain/chat_models/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "langchain/schema";

// Environment variables
import { OPENAI_API_KEY } from "../.env";
// Parameters
import { URL_PARAM_ENUMS, URL_PARAM_MSGS, EXTERNAL_LINK_ENUMS, EXTERNAL_LINK_MSGS } from "../params/enums";
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
      url_param_enum: {
        type: "string",
        enum: URL_PARAM_ENUMS,
        description: "The URL parameter to extract.",
      },
      url_param_msg: {
        type: "string",
        enum: URL_PARAM_MSGS,
        description: "The message about rerouting to the webpage which is sent to the user.",
      },
      external_link_enum: {
        type: "string",
        enum: EXTERNAL_LINK_ENUMS,
        description: "The external link to extract.",
      },
      external_link_msg: {
        type: "string",
        enum: EXTERNAL_LINK_MSGS,
        description: "The message about rerouting to the external link which is sent to the user.",
      },
    },
    required: ["url_param_enum", "url_param_msg", "external_link_enum", "external_link_msg"],
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
      external_link: "https://cal.com/download",
      message: "Going to /apps"
    }
  }
  */
};

export default run;
