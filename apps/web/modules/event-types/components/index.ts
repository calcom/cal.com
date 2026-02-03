import dynamic from "next/dynamic";

export { default as CheckedTeamSelect } from "@calcom/features/eventtypes/components/CheckedTeamSelect";
export { default as EventTypeDescription } from "./EventTypeDescription";
export { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
export { MultiplePrivateLinksController } from "./MultiplePrivateLinksController";
export const EventTypeDescriptionLazy = dynamic(() => import("./EventTypeDescription"));
