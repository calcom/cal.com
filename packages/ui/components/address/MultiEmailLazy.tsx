import dynamic from "next/dynamic";

/** These are like 40kb that not every user needs */
const MultiEmail = dynamic(() => import("./MultiEmail")) as unknown as typeof import("./MultiEmail").default;

export default MultiEmail;
