import { createRouter } from "../createRouter";
import { z } from "zod";

export const testRouter = createRouter().query("hello", {
  input: z.string().nullish(),
  resolve({ input }) {
    return input ?? "world";
  },
});
