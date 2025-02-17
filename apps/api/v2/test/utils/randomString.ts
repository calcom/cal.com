import { v4 as uuidv4 } from "uuid";

export function randomString() {
  return uuidv4().replace(/-/g, "");
}
