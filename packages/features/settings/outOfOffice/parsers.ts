import { parseAsBoolean } from "nuqs";

export const outOfOfficeModalParsers = {
  "ooo-modal": parseAsBoolean.withDefault(false),
};

