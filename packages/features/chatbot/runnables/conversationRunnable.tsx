import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationSummaryMemory } from "langchain/memory";
import { PromptTemplate } from "langchain/prompts";

import { OPENAI_API_KEY } from "../.env";
import { GPT_MODEL } from "../params/models";

// Component 1: short-term memory
const memory = new ConversationSummaryMemory({
  memoryKey: "chat_history",
  llm: new ChatOpenAI({
    modelName: GPT_MODEL,
    openAIApiKey: OPENAI_API_KEY,
    temperature: 0,
  }),
});

// Component 2: chatbot
const model = new ChatOpenAI({
  modelName: GPT_MODEL,
  openAIApiKey: OPENAI_API_KEY,
  temperature: 0,
});

// Component 3: prompt template
const prompt =
  PromptTemplate.fromTemplate(`The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.

  Current conversation:
  {chat_history}
  Human: {input}
  AI:`);

// Component 4: model chain
const chain = new LLMChain({ llm: model, prompt, memory });

const run = async (inputValue: string) => {
  const result = await chain.call({ input: inputValue });
  return result;
};

export default run;
