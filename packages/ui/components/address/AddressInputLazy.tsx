import dynamic from "next/dynamic";

/** These are like 40kb that not every user needs */
const AddressInput = dynamic(
  () => import("./AddressInput")
) as unknown as typeof import("./AddressInput").default;

export default AddressInput;
