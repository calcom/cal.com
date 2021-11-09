import { ExternalProvider, JsonRpcFetchFunc, Web3Provider } from "@ethersproject/providers";
import { useWeb3React, Web3ReactProvider } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import Image from "next/image";
import { useEffect, useState } from "react";

import classNames from "@lib/classNames";
import useLocalStorage from "@lib/hooks/useLocalStorage";
import { useLocale } from "@lib/hooks/useLocale";

import { List, ListItem, ListItemTitle, ListItemText } from "@components/List";
import { ShellSubHeading } from "@components/Shell";
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

export default function Web3Integration() {
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
      <>
        <ShellSubHeading
          title="Wallets" //{t("connect_a_wallet")}
          subtitle="Enable Web3 features: Only offer bookings for DAO members, stake and slash coins for no-shows" //{t("to_use_web_3_features")}
          className="mt-10"
        />
        <div className="lg:pb-8 lg:col-span-9">
          <List>
            {!web3React.active ? (
              <>
                <ListItem className={classNames("flex-col")}>
                  <div className={classNames("flex flex-1 space-x-2 w-full p-3 items-center")}>
                    <Image width={40} height={40} src="/integrations/metamask.svg" alt="MetaMask" />
                    <div className="flex-grow pl-2 truncate">
                      <ListItemTitle component="h3">MetaMask</ListItemTitle>
                      <ListItemText component="p">Connect to MetaMask</ListItemText>
                    </div>
                    <Button
                      onClick={() => {
                        setLatestConnector(ConnectorNames.Injected);
                        setLatestOp(W3Operations.Connect);
                        web3React.activate(injected);
                      }}
                      color="secondary">
                      {t("connect")}
                    </Button>
                  </div>
                </ListItem>
                <ListItem className={classNames("flex-col")}>
                  <div className={classNames("flex flex-1 space-x-2 w-full p-3 items-center")}>
                    <Image width={40} height={40} src="/integrations/walletconnect.svg" alt="WalletConnect" />
                    <div className="flex-grow pl-2 truncate">
                      <ListItemTitle component="h3">WalletConnect</ListItemTitle>
                      <ListItemText component="p">Connect via WalletConnect</ListItemText>
                    </div>
                    <Button
                      onClick={() => {
                        setLatestConnector(ConnectorNames.WalletConnect);
                        setLatestOp(W3Operations.Connect);
                        web3React.activate(wcConnector);
                      }}
                      color="secondary">
                      {t("connect")}
                    </Button>
                  </div>
                </ListItem>
              </>
            ) : (
              <>
                <ListItem className={classNames("flex-col")}>
                  <div className={classNames("flex flex-1 space-x-2 w-full p-3 items-center")}>
                    <div className="flex-grow pl-2 truncate">
                      <ListItemTitle component="h3">{getNetwork(web3React.chainId)}</ListItemTitle>
                      <ListItemText component="p">{getTruncatedAddress(web3React.account)}</ListItemText>
                    </div>
                    <Button
                      onClick={() => {
                        setLatestOp(W3Operations.Disconnect);
                        web3React.deactivate();
                      }}
                      color="warn">
                      {t("disconnect")}
                    </Button>
                  </div>
                </ListItem>
              </>
            )}
          </List>
        </div>
      </>
    </>
  );
}
