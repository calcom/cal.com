import dynamic from "next/dynamic";

/** These are like 40kb that not every user needs */
const PhoneInputLazy = dynamic(
  () => import("./phone-input")
) as unknown as typeof import("./phone-input").default;

export { PhoneInputLazy };
