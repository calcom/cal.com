import dynamic from "next/dynamic";

/** These are like 40kb that not every user needs */
const PhoneInputLazy = dynamic(
  () => import("./PhoneInput")
) as unknown as typeof import("./PhoneInput").default;

export default PhoneInputLazy;
