import { WagmiProvider, chain, defaultChains, developmentChains } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { WalletLinkConnector } from "wagmi/connectors/walletLink";

// API key for Ethereum node
// Two popular services are Infura (infura.io) and Alchemy (alchemy.com)
const infuraId = process.env.INFURA_ID;

// Chains for connectors to support
const chains = [...defaultChains, ...developmentChains];

// Set up connectors
const connectors = ({ chainId }) => {
  const rpcUrl = chains.find((x) => x.id === chainId)?.rpcUrls?.[0] ?? chain.mainnet.rpcUrls[0];
  return [
    new InjectedConnector({
      chains,
      options: { shimDisconnect: true },
    }),
    new WalletConnectConnector({
      options: {
        infuraId,
        qrcode: true,
      },
    }),
    new WalletLinkConnector({
      options: {
        appName: "Cal.com",
        jsonRpcUrl: `${rpcUrl}/${infuraId}`,
      },
    }),
  ];
};

export default function Web3Provider({ children }) {
  return (
    <WagmiProvider autoConnect connectors={connectors}>
      {children}
    </WagmiProvider>
  );
}
