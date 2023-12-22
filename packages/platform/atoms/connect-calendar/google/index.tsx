import { useApiKey } from "cal-provider";
import { NO_KEY_VALUE, INVALID_API_KEY } from "cal-provider/errors";
import { ConnectButton } from "connect-to-cal-button/Button";

type ConnectGoogleCalendarProps = { redirect_uri: string };

type OAuthApiResponse = { url: string };

export function ConnectGoogleCalendar({ redirect_uri }: ConnectGoogleCalendarProps) {
  const { key, error } = useApiKey();

  const handleClick = async () => {
    try {
      const response = await fetch(`http://localhost:5555/api/v2/oauth?apiKey=%${key}`);
      const data: OAuthApiResponse = await response.json();

      if (response.ok) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (error === NO_KEY_VALUE) {
    return <>You havent entered a key</>;
  }

  if (error === INVALID_API_KEY) {
    return <>This is not a valid key, please enter a valid key</>;
  }

  return (
    <>
      <ConnectButton onClick={handleClick}>Google Calendar</ConnectButton>
    </>
  );
}
