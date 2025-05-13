/**
 * @deprecated This barrel file is being phased out. Please import directly from the source files.
 * For example, instead of `import { isPrismaObj } from "@calcom/lib"`,
 * use `import { isPrismaObj } from "@calcom/lib/isPrismaObj"`.
 */

export { default as isPrismaObj, isPrismaObjOrUndefined } from "./isPrismaObj";
export * from "./isRecurringEvent";
export * from "./isEventTypeColor";
export * from "./schedules";
export * from "./event-types";

export { CreditType } from "@calcom/prisma/enums";
