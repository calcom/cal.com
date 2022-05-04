import dynamic from "next/dynamic";

export { default as InstallAppButton } from "./InstallAppButton";
/** These are like 40kb that not every user needs */
export const SpaceBookingSuccessPage = dynamic(() => import("./SpaceBookingSuccessPage"));
