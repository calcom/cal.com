import type { Tasker } from "./tasker";
import { getTasker } from "./tasker-factory";
import process from "node:process";

const globalForTasker = global as unknown as {
  tasker: Tasker;
};

export const tasker = globalForTasker.tasker || getTasker();

if (process.env.NODE_ENV !== "production") {
  globalForTasker.tasker = tasker;
}

export default tasker;
