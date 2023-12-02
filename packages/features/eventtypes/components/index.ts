import dynamic from "next/dynamic";

export { default as CheckedTeamSelect } from "./CheckedTeamSelect";
export { default as CreateEventTypeDialog } from "./CreateEventTypeDialog";
export { default as CreateEventTypeWithCopilotDialog } from "./CreateEventTypeWithCopilotDialog";
export { default as EventTypeDescription } from "./EventTypeDescription";
export const EventTypeDescriptionLazy = dynamic(() => import("./EventTypeDescription"));
