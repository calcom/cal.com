import { useApiKey } from "cal-provider";
import { ConnectButton } from "connect/ConnectButton";

// This atom will initiate the oAuth connection process to the users of the platform
// the user would be redirected to grant oAuth permission page after the user has clicked on Connect Atom
// they will have to login/signup and then will be redirected to the permission page where they can see required permissions for the oAuth clients and can choose to deny or accept

export function ConnectCal() {
  const key = useApiKey();

  if (key === "no_key") {
    return <>You havent entered a key</>;
  }

  if (key === "invalid_key") {
    return <>This is not a valid key, please enter a valid key</>;
  }

  return (
    <>
      <ConnectButton>Connect to Cal.com</ConnectButton>
    </>
  );
}
