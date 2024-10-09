import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

export const generateHashedLink = (id: number | string) => {
  const translator = short();
  const seed = `${id}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
  return uid;
};
