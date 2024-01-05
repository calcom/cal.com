import { useApiKey } from "../cal-provider";
import { ConnectButton } from "../connect-to-cal-button/Button";

// This atom will initiate the oAuth connection process to the users of the platform
// the user would be redirected to grant oAuth permission page after the user has clicked on Connect Atom
// they will have to login/signup and then will be redirected to the permission page where they can see required permissions for the oAuth clients and can choose to deny or accept

export function ConnectToCal() {
  const { key } = useApiKey();

  const handleClick = () => {
    // TODO: the url to redirect should include a client_id and redirect_uri
    window.location.href = `https://app.cal.com/auth/login?client_id=%${key}&redirect_uri=`;
  };

  if (key === "no_key") {
    return <>You havent entered a key</>;
  }

  if (key === "invalid_key") {
    return <>This is not a valid key, please enter a valid key</>;
  }

  return (
    <>
      <ConnectButton onClick={handleClick}>Connect to Cal.com</ConnectButton>
    </>
  );
}
