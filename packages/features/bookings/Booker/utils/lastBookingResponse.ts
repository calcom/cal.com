import logger from "@calcom/lib/logger";
import { localStorage } from "@calcom/lib/webstorage";

// const responsesToStore = ["email", "name"];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setLastBookingResponse = (responses: Record<string, unknown> | null) => {
  return;
  // if (!responses) return;
  // const prevResponse = Object.fromEntries(
  //   Object.entries(responses).filter(([key]) => responsesToStore.includes(key))
  // );
  // localStorage.setItem("lastBookingResponse", JSON.stringify(prevResponse));
};

export const getLastBookingResponse = () => {
  const lastBookingResponse = localStorage.getItem("lastBookingResponse");
  try {
    return JSON.parse(lastBookingResponse ?? "{}");
  } catch (err) {
    logger.error("Error parsing lastBookingResponse: ", err);
    return {};
  }
};
