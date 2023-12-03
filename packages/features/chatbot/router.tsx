import { ChatOpenAI } from "langchain/chat_models/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "langchain/schema";

import { OPENAI_API_KEY } from "./.env";
import { routerEnums } from "./params/enums";

const router = async (inputValue: string) => {
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
          enum: routerEnums,
          description: "The URL parameter to extract.",
        },
      },
      required: ["url_param"],
    },
  };

  // Instantiate the ChatOpenAI class
  const model = new ChatOpenAI({
    modelName: "gpt-4",
    openAIApiKey: OPENAI_API_KEY,
  });

  // Create a new runnable, bind the function to the model, and pipe the output through the parser
  const runnable = model
    .bind({
      functions: [extractionFunctionSchema],
      function_call: { name: "extractor" },
    })
    .pipe(parser);

  // Invoke the runnable with an input
  const result = await runnable.invoke([new HumanMessage(inputValue)]);

  console.log({ inputValue, result });
  return result;

  /**
  {
    result: {
      url_param: "/apps"
    }
  }
  */
};

export default router;
