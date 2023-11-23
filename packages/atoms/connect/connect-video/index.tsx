import { useApiKey } from "cal-provider";
import { ConnectButton } from "connect/ConnectButton";

type ConnectVideoProps = {
  app: "zoom" | "google" | "facetime" | "cal video";
};

// TODO: figure out event handler flow for video apps

export function ConnectVideo({ app }: ConnectVideoProps) {
  const key = useApiKey();

  if (key === "no_key") {
    return <>You havent entered a key</>;
  }

  if (key === "invalid_key") {
    return <>This is not a valid key, please enter a valid key</>;
  }

  return (
    <>
      <ConnectButton>Connect {app}</ConnectButton>
    </>
  );
}
