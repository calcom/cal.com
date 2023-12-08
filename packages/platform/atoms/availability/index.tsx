import Shell from "@calcom/features/shell/Shell";

import { useApiKey } from "../cal-provider";

type AvailabilityProps = {
  id: string;
};

export function Availability({ id }: AvailabilityProps) {
  const { key, error } = useApiKey();

  if (error === "no_key") return <>You havent entered a key</>;

  if (error === "invalid_key") return <>This is not a valid key, please enter a valid key</>;

  return <Shell />;
}
