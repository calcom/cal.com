import React from "react";
import { useAccount } from "wagmi";
import { useConnect } from "wagmi";
import { useBalance } from "wagmi";

import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";

import { Button } from "@components/ui/Button";

interface CryptoSectionProps {
  id: number | string;
  pathname: string;
  smartContractAddress: string;
}

const CryptoSection = (props: CryptoSectionProps) => {
  // Crypto section which should be shown on booking page if event type requires a smart contract token.
  const { t } = useLocale();
  const [{ data, error }, connect] = useConnect();
  const [account, disconnect] = useAccount({ fetchEns: true });
  const [balance] = useBalance({
    addressOrName: account?.data?.address,
    token: props?.smartContractAddress,
  });

  if (error) {
    showToast(error.message, "error");
  }

  return (
    <div
      className="align-center my-5 flex h-12 transform flex-row space-x-5 text-sm opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-900"
      id={`crypto-${props.id}`}>
      {/* If already connected, show log out / disconnect button */}
      {/* {balance.data && <div>{balance.data.formatted}</div>} */}
      {data.connected && (
        <Button onClick={disconnect} color="secondary">
          Disconnect wallet
        </Button>
      )}
      {!data.connected &&
        data.connectors.map((connector) => (
          <Button
            className="h-10"
            color="secondary"
            key={connector.id}
            onClick={() => connect(connector)}
            type="button"
            size="icon"
            id="hasToken"
            name="hasToken">
            <img
              className="mr-1 h-5"
              src={`/integrations/${
                connector?.name === "Coinbase Wallet"
                  ? "coinbasewallet"
                  : connector?.name === "Injected"
                  ? "metamask"
                  : connector.name
              }.svg`}
            />
            {`${t("use")} ${connector.name}`}
            {!connector.ready && " (unsupported)"}
          </Button>
        ))}
    </div>
  );
};

export default CryptoSection;
