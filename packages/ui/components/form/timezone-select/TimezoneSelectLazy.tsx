import dynamic from "next/dynamic";

/** These are like 212kb that not every user needs */
const TimezoneSelectLazy = dynamic(
  () => import("./TimezoneSelect")
) as unknown as typeof import("./TimezoneSelect").default;

export default TimezoneSelectLazy;
