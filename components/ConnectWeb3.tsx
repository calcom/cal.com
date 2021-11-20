import { ExternalProvider, JsonRpcFetchFunc, Web3Provider } from "@ethersproject/providers";
import { useWeb3React, Web3ReactProvider } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { useEffect, useState } from "react";

import classNames from "@lib/classNames";
import useLocalStorage from "@lib/hooks/useLocalStorage";
import { useLocale } from "@lib/hooks/useLocale";

import Button from "@components/ui/Button";

const injected = new InjectedConnector({ supportedChainIds: [1, 3, 4, 5, 42] });
const wcConnector = new WalletConnectConnector({
  infuraId: "517bf3874a6848e58f99fa38ccf9fce4",
});

const ConnectorNames = {
  Injected: "injected",
  WalletConnect: "walletconnect",
};

const W3Operations = {
  Connect: "connect",
  Disconnect: "disconnect",
};

function getLibrary(provider: ExternalProvider | JsonRpcFetchFunc) {
  const library = new Web3Provider(provider);
  // library.pollingInterval = 12000;
  return library;
}

export default function ConnectWeb3() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Web3Component />
    </Web3ReactProvider>
  );
}

function Web3Component() {
  const { t } = useLocale();
  const web3React = useWeb3React();
  const [, setLoaded] = useState(false);

  const [latestOp, setLatestOp] = useLocalStorage("latest_op", "");
  const [latestConnector, setLatestConnector] = useLocalStorage("latest_connector", "");
  // console.log(web3React);

  useEffect(() => {
    if (latestOp == "connect" && latestConnector == "injected") {
      injected
        .isAuthorized()
        .then((isAuthorized) => {
          setLoaded(true);
          if (isAuthorized && !web3React.active && !web3React.error) {
            web3React.activate(injected);
          }
        })
        .catch(() => {
          setLoaded(true);
        });
    } else if (latestOp == "connect" && latestConnector == "walletconnect") {
      web3React.activate(wcConnector);
    }
  }, []);

  const getTruncatedAddress = (address: string | null | undefined) => {
    if (address && address.startsWith("0x")) {
      return address.substr(0, 4) + "..." + address.substr(address.length - 4);
    }
    return address;
  };

  const getNetwork = (chainId: number | undefined) => {
    switch (chainId) {
      case 1:
        return "Mainnet";
      case 3:
        return "Ropsten";
      case 4:
        return "Rinkeby";
      case 5:
        return "Goerli";
      case 42:
        return "Kovan";
      default:
        return `unknown network ${chainId}`;
    }
  };

  return (
    <>
      {!web3React.active ? (
        <>
          <div className="transition-opacity opacity-0 group-hover:opacity-100 space-x-2">
            <Button
              onClick={() => {
                setLatestConnector(ConnectorNames.Injected);
                setLatestOp(W3Operations.Connect);
                web3React.activate(injected);
              }}
              color="secondary">
              <img className="h-5 mr-1" src="/integrations/metamask.svg" />
              MetaMask
            </Button>

            <Button
              onClick={() => {
                setLatestConnector(ConnectorNames.WalletConnect);
                setLatestOp(W3Operations.Connect);
                web3React.activate(wcConnector);
              }}
              color="secondary">
              <img className="h-5 mr-1" src="/integrations/walletconnect.svg" />
              WalletConnect
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={classNames("fixed top-0 right-10 flex-col shadow dark:bg-gray-100")}>
            <div className="flex-grow p-2 truncate">
              <h3 className="text-green-500">{getNetwork(web3React.chainId)}</h3>
              <p className="text-black mb-2">{getTruncatedAddress(web3React.account)}</p>
            </div>
            <div className="bg-white p-2">
              <Button
                onClick={() => {
                  setLatestOp(W3Operations.Disconnect);
                  web3React.deactivate();
                }}
                color="warn">
                {t("disconnect")}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
