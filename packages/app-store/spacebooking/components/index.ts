import dynamic from "next/dynamic";

export { default as InstallAppButton } from "./InstallAppButton";
/** These are like 12kb that not every user needs */
export const SpaceBookingSuccessPage = dynamic(() => import("./SpaceBookingSuccessPage"));
