import { AppCategories } from "@prisma/client";
import { object, nativeEnum } from "zod";

export const listLocalSchema = object({
  category: nativeEnum({ ...AppCategories, conferencing: "conferencing" }),
});
