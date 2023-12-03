import { ChatOpenAI } from "langchain/chat_models/openai";

import { OPENAI_API_KEY } from "../.env";
import { GPT_MODEL } from "../params/models";

const run = async (inputVariable: string) => {
  const model = new ChatOpenAI({
    modelName: GPT_MODEL,
    openAIApiKey: OPENAI_API_KEY,
  });

  const result = await model.invoke([]);

  return {
    inputVariable: inputVariable,
  };
};

export default run;
