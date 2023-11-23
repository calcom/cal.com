import { useApiKey } from "cal-provider";
import { ConnectButton } from "connect/ConnectButton";

type ConnectCalendarProps = {
  calendar: "google" | "outlook";
};

// TODO: implement flow for connecting to different calendars
// ideally when you click the connect calendar button it redirects the user to an accounts.google page
// this page asks the user permission for us to access their account
// after the user grants us all permissions we need to redirect the user back to where they started
// hopefully to the page wherever the button is situated

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
      <ConnectButton>Connect {calendar}</ConnectButton>
    </>
  );
}
