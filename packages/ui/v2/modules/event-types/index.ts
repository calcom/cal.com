import dynamic from "next/dynamic";

export { default as CheckedTeamSelect } from "./CheckedTeamSelect";
export { default as CustomInputItem } from "./CustomInputItem";
export const EventTypeDescriptionLazy = dynamic(() => import("./EventTypeDescription"));
