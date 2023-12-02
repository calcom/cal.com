import { ChatOpenAI } from "langchain/chat_models/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "langchain/schema";

import { gptModel } from "./models";

const router = async () => {
  // Instantiate the parser
  const parser = new JsonOutputFunctionsParser();

  // Define the function schema
  const extractionFunctionSchema = {
    name: "extractor",
    description: "Extracts fields from the input.",
    parameters: {
      type: "object",
      properties: {
        tone: {
          type: "string",
          enum: ["positive", "negative"],
          description: "The overall tone of the input",
        },
        word_count: {
          type: "number",
          description: "The number of words in the input",
        },
        chat_response: {
          type: "string",
          description: "A response to the human's input",
        },
      },
      required: ["tone", "word_count", "chat_response"],
    },
  };

  // Instantiate the ChatOpenAI class
  const model = new ChatOpenAI({ modelName: gptModel });

  // Create a new runnable, bind the function to the model, and pipe the output through the parser
  const runnable = model
    .bind({
      functions: [extractionFunctionSchema],
      function_call: { name: "extractor" },
    })
    .pipe(parser);

  // Invoke the runnable with an input
  const result = await runnable.invoke([new HumanMessage("What a beautiful day!")]);

  console.log({ result });

  /**
  {
    result: {
      tone: 'positive',
      word_count: 4,
      chat_response: "Indeed, it's a lovely day!"
    }
  }
  */
};

export default router;
