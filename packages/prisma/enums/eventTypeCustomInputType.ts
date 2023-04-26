import type { EventTypeCustomInputType } from "@prisma/client";

export const eventTypeCustomInputType: { [K in EventTypeCustomInputType]: K } = {
  TEXT: "TEXT",
  TEXTLONG: "TEXTLONG",
  NUMBER: "NUMBER",
  BOOL: "BOOL",
  RADIO: "RADIO",
  PHONE: "PHONE",
};

export default eventTypeCustomInputType;
