import { v4 as uuidv4 } from "uuid";

export function randomString(length?: number) {
  const string = uuidv4().replace(/-/g, "");
  return length ? string.substring(0, length) : string;
}
