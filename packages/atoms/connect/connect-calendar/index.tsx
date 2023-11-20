import { useApiKey } from "cal-provider";
import { ConnectButton } from "connect/ConnectButton";

type ConnectCalendarProps = {
  calendar: "google" | "outlook";
};

// TODO: figure out event handler flow for different calendars

export function ConnectCalendar({ calendar }: ConnectCalendarProps) {
  const key = useApiKey();

  if (key === "no_key") {
    return <>You havent entered a key</>;
  }

  if (key === "invalid_key") {
    return <>This is not a valid key, please enter a valid key</>;
  }

  return (
    <>
      <ConnectButton />
    </>
  );
}
