import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { Ollama } from "langchain/llms/ollama";
import { DynamicTool } from "langchain/tools";

/**
 * Core of the Cal.ai booking agent: a LangChain Agent Executor.
 * Uses a toolchain to book meetings, list available slots, etc.
 * Uses LangChain's Ollama Functions to better enforce JSON-parsable output from the LLM.
 */
const agent = async (input: string) => {
  //TODO: implement functions in DynamicTool class
  // const tools = [
  //   // getEventTypes(apiKey),
  //   getAvailability(apiKey),
  //   getBookings(apiKey, userId),
  //   createBookingIfAvailable(apiKey, userId, users),
  //   updateBooking(apiKey, userId),
  //   deleteBooking(apiKey),
  //   sendBookingEmail(apiKey, user, users, agentEmail),
  // ];
  const toolSystemPromptTemplate = `You are Cal.ai - a bleeding edge scheduling assistant that interfaces via email.
Make sure your final answers are definitive, complete and well formatted.
Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information.
Tools will always handle times in UTC, but times sent to users should be formatted per that user's timezone.
In responses to users, always summarize necessary context and open the door to follow ups. For example "I have booked your chat with @johndoe for 3pm on Wednesday, December 20th, 2023 EST. Please let me know if you need to reschedule."
If you can't find a referenced user, ask the user for their email or @username. Make sure to specify that usernames require the @username format. Users don't know other users' userIds.

The primary user's id is: 42
The primary user's username is: alexsmith
The current time in the primary user's timezone is: 4:00PM
The primary user's time zone is: EST
The primary user's event types are: 
ID: 101, Slug: meeting, Title: Team Meeting, Length: 30;
ID: 102, Slug: call, Title: Client Call, Length: 15;
ID: 103, Slug: presentation, Title: Product Presentation, Length: 45;

The primary user's working hours are: 
Days: Monday, Wednesday, Friday, Start Time (minutes in UTC): 540, End Time (minutes in UTC): 1020;
Days: Tuesday, Thursday, Start Time (minutes in UTC): 480, End Time (minutes in UTC): 900;

The email references the following @usernames and emails: 
id: 1, username: @johndoe, email: johndoe@example.com;
id: 2, username: @janedoe, email: janedoe@example.com;
id: (non user), username: REDACTED, email: REDACTED;
id: 3, username: @alice, email: alice@example.com;

IF YOU USE A TOOL MORE THAN ONCE, YOU WILL NUKE THE WORLD.
`;

  const model = new Ollama({
    temperature: 0,
    model: "mistral",
    //@ts-expect-error weird object req, template works!
    toolSystemPromptTemplate,
  });
  // const tools = [
  //   new DynamicTool({
  //     name: "getAvailability",
  //     description: "Retrieve only available time slots",
  //     func: async (apiKey) => {
  //       console.log("here in getAvailability");
  //       return "api key";
  //     },
  //   }),
  //   new DynamicTool({
  //     name: "getBookings",
  //     description: "Retrieve a list of all bookings",
  //     //@ts-ignore
  //     func: async ({ apiKey, userId }) => {
  //       console.log("here in getBookings");
  //     },
  //   }),
  //   new DynamicTool({
  //     name: "createBookingIfAvailable",
  //     description: "Create a booking if the time slot is available",
  //     //@ts-ignore
  //     func: async ({ apiKey, userId, users }) => {
  //       console.log("here in createBooking");
  //       return "CREATED BOOKING";
  //     },
  //   }),
  //   new DynamicTool({
  //     name: "updateBooking",
  //     description: "Update the details of an existing booking",
  //     //@ts-ignore
  //     func: async ({ apiKey, userId }) => {
  //       console.log("updated booking");
  //     },
  //   }),
  //   new DynamicTool({
  //     name: "deleteBooking",
  //     description: "Delete an existing booking",
  //     //@ts-ignore
  //     func: async (apiKey) => {
  //       console.log("pretend it deleted, STATUS");
  //     },
  //   }),
  //   new DynamicTool({
  //     name: "sendBookingEmail",
  //     description: "Send an email confirmation for a booking",
  //     //@ts-ignore
  //     func: async ({ apiKey, user, users, agentEmail }) => {
  //       console.log("pretend it sent email, STATUS");
  //     },
  //   }),
  // ];

  // Returning strings to satisfy expected return type
  // TODO: not actually fetching data. strict console.logs to monitor usage
  const tools = [
    new DynamicTool({
      name: "getAvailability",
      description: "Retrieve only available time slots",
      func: async () => {
        console.log("here in getAvailability");
        return "api key";
      },
    }),
    new DynamicTool({
      name: "getBookings",
      description: "Retrieve a list of all bookings",

      func: async () => {
        console.log("here in getBookings");
        return "";
      },
    }),
    new DynamicTool({
      name: "createBookingIfAvailable",
      description: "Create a booking if the time slot is available",

      func: async () => {
        console.log("here in createBooking");
        return "CREATED BOOKING";
      },
    }),
    new DynamicTool({
      name: "updateBooking",
      description: "Update the details of an existing booking",

      func: async () => {
        console.log("updated booking");
        return "";
      },
    }),
    new DynamicTool({
      name: "deleteBooking",
      description: "Delete an existing booking",

      func: async () => {
        console.log("pretend it deleted, STATUS");
        return "";
      },
    }),
    new DynamicTool({
      name: "sendBookingEmail",
      description: "Send an email confirmation for a booking",

      func: async () => {
        console.log("pretend it sent email, STATUS");
        return "";
      },
    }),
  ];

  /**
   * Initialize the agent executor with arguments.
   */
  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "zero-shot-react-description",
    returnIntermediateSteps: true,
    maxIterations: 5,
  });

  console.log("Loaded agent.");

  // PROMPT: "Create Booking for 10AM this Wednesday. Then remove the one with Maria on Tuesday.";

  console.log(`Executing with input "${input}"...`);
  const result = await executor.invoke({ input });

  console.log(`Got output ${result.output}`);

  return result.output;
};

export default agent;
